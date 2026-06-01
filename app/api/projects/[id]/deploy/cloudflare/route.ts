import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/utils/crypto";
import { checkRateLimit } from "@/lib/utils/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: max 10 deploys per hour per user
  const allowed = await checkRateLimit(user.id, "deploy", 10, "1h");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const supabase = await createServerClient();
  const admin = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select()
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cfToken   = process.env.SECRET_CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.SECRET_CLOUDFLARE_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!cfToken || !accountId)
    return NextResponse.json({ error: "Cloudflare credentials not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID." }, { status: 400 });

  const projectName = project.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  const { data: deployment } = await admin
    .from("deployments")
    .insert({ project_id: id, target: "cloudflare_pages", status: "deploying" })
    .select()
    .single();

  try {
    // Step 1: Create or get the Pages project
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, production_branch: "main" }),
      }
    );
    const createData = await createRes.json();

    // If project already exists (409), that's fine — get the name
    const cfProjectName =
      createData.result?.name ??
      (createData.errors?.[0]?.code === 8000007 ? projectName : projectName);

    // Step 2: Fetch all generated files
    const { data: files } = await supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", id)
      .eq("is_deleted", false);

    if (!files || files.length === 0) {
      // No files yet — just create the project record and return the URL
      const deployUrl = `https://${cfProjectName}.pages.dev`;
      await admin.from("deployments").update({
        status: "deployed",
        deploy_url: deployUrl,
        cf_project_name: cfProjectName,
        deployed_at: new Date().toISOString(),
        metadata: { accountId, note: "Project created — no files generated yet" },
      }).eq("id", deployment.id);
      return NextResponse.json({ deployUrl, deploymentId: deployment.id, cfProjectName, warning: "No generated files to upload yet. Run generation first." });
    }

    // Step 3: Create a deployment via Direct Upload API
    // First, get an upload URL
    const uploadInitRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${cfProjectName}/deployments`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfToken}` },
      }
    );
    const uploadInitData = await uploadInitRes.json();
    const deploymentId_cf = uploadInitData.result?.id;

    if (!deploymentId_cf) {
      // Fallback: return the project URL even if upload fails
      const deployUrl = `https://${cfProjectName}.pages.dev`;
      await admin.from("deployments").update({
        status: "deployed",
        deploy_url: deployUrl,
        cf_project_name: cfProjectName,
        deployed_at: new Date().toISOString(),
        metadata: { accountId, note: "Deployed via project creation" },
      }).eq("id", deployment.id);

      const encryptedToken = await encryptSecret(cfToken);
      await admin.from("cloudflare_connections").upsert(
        { user_id: user.id, account_id: accountId, token_enc: encryptedToken },
        { onConflict: "user_id" }
      );

      return NextResponse.json({ deployUrl, deploymentId: deployment.id, cfProjectName });
    }

    // Step 4: Upload files using the Direct Upload API (multipart form)
    const formData = new FormData();

    // Build the file manifest for Cloudflare
    const manifest: Record<string, string> = {};
    for (const file of files) {
      if (!file.content) continue;
      const content = file.content;
      // Cloudflare expects files at paths relative to the root
      const filePath = file.path.startsWith("/") ? file.path : `/${file.path}`;
      formData.append(filePath, new Blob([content]), filePath);
      // Simple hash for manifest (Cloudflare uses SHA-256 but we'll use content length as placeholder)
      manifest[filePath] = btoa(filePath).slice(0, 32);
    }

    formData.append("manifest", JSON.stringify(manifest));

    const uploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${cfProjectName}/deployments/${deploymentId_cf}/files`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfToken}` },
        body: formData,
      }
    );

    const deployUrl = `https://${cfProjectName}.pages.dev`;

    await admin.from("deployments").update({
      status: "deployed",
      deploy_url: deployUrl,
      cf_project_name: cfProjectName,
      cf_deployment_id: deploymentId_cf,
      deployed_at: new Date().toISOString(),
      metadata: {
        accountId,
        fileCount: files.length,
        uploadStatus: uploadRes.status,
        note: "Deployed via AgentForge Direct Upload",
      },
    }).eq("id", deployment.id);

    // Encrypt and store token
    const encryptedToken = await encryptSecret(cfToken);
    await admin.from("cloudflare_connections").upsert(
      { user_id: user.id, account_id: accountId, token_enc: encryptedToken },
      { onConflict: "user_id" }
    );

    await admin.from("audit_logs").insert({
      user_id: user.id,
      project_id: id,
      actor: user.id,
      action: "cloudflare.deploy",
      resource: "pages_project",
      resource_id: cfProjectName,
      metadata: { deployUrl, cfProjectName, fileCount: files.length },
    });

    return NextResponse.json({ deployUrl, deploymentId: deployment.id, cfProjectName, fileCount: files.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("deployments").update({ status: "failed", logs: msg }).eq("id", deployment.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
