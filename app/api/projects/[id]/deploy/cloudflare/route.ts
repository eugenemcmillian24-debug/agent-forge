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
    return NextResponse.json({ error: "Cloudflare credentials not configured" }, { status: 400 });

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
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, production_branch: "main" }),
      }
    );
    const createData = await createRes.json();
    const cfProjectName = createData.result?.name ?? projectName;
    const deployUrl = `https://${cfProjectName}.pages.dev`;

    await admin
      .from("deployments")
      .update({
        status: "deployed",
        deploy_url: deployUrl,
        cf_project_name: cfProjectName,
        deployed_at: new Date().toISOString(),
        metadata: { accountId, note: "Deployed via AgentForge API" },
      })
      .eq("id", deployment.id);

    // Encrypt token before storing
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
      metadata: { deployUrl, cfProjectName },
    });

    return NextResponse.json({ deployUrl, deploymentId: deployment.id, cfProjectName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("deployments").update({ status: "failed", logs: msg }).eq("id", deployment.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
