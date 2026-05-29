import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServerClient();
  const admin = createAdminClient();

  const { data: project } = await supabase.from("projects").select().eq("id", params.id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Use env secrets directly (from workspace secrets)
  const cfToken     = process.env.SECRET_CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
  const accountId   = process.env.SECRET_CLOUDFLARE_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!cfToken || !accountId) return NextResponse.json({ error: "Cloudflare credentials not configured" }, { status: 400 });

  const projectName = project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 50);

  // Create deployment record
  const { data: deployment } = await admin.from("deployments").insert({
    project_id: params.id, target: "cloudflare_pages", status: "deploying",
  }).select().single();

  try {
    // Create / get Cloudflare Pages project
    const createRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${cfToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName, production_branch: "main" }),
    });
    const createData = await createRes.json();
    const cfProjectName = createData.result?.name ?? projectName;
    const deployUrl = `https://${cfProjectName}.pages.dev`;

    await admin.from("deployments").update({
      status: "deployed",
      deploy_url: deployUrl,
      cf_project_name: cfProjectName,
      deployed_at: new Date().toISOString(),
      metadata: { accountId, note: "Deployed via AgentForge API" },
    }).eq("id", deployment.id);

    await admin.from("cloudflare_connections").upsert({
      user_id: user.id, account_id: accountId, token_enc: cfToken,
    }, { onConflict: "user_id" });

    await admin.from("audit_logs").insert({
      user_id: user.id, project_id: params.id, actor: user.id,
      action: "cloudflare.deploy", resource: "pages_project", resource_id: cfProjectName,
      metadata: { deployUrl, cfProjectName },
    });

    return NextResponse.json({ deployUrl, deploymentId: deployment.id, cfProjectName });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await admin.from("deployments").update({ status: "failed", logs: msg }).eq("id", deployment.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
