import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildExportZip, type ExportManifest } from "@/lib/export/zip";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createServerClient();
  const { data: project } = await supabase.from("projects").select().eq("id", id).eq("user_id", user.id).single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: files } = await supabase.from("project_files")
    .select("path, content, agent_id").eq("project_id", id).eq("is_deleted", false);

  if (!files?.length) return NextResponse.json({ error: "No files to export" }, { status: 400 });

  const manifest: ExportManifest = {
    project_name: project.name,
    version: 1,
    exported_at: new Date().toISOString(),
    file_count: files.length,
    total_size: files.reduce((acc, f) => acc + (f.content?.length ?? 0), 0),
    tech_stack: ["Next.js 15", "TypeScript", "Tailwind CSS", "Supabase"],
    files: files.map(f => ({ path: f.path, size: f.content?.length ?? 0, agent: f.agent_id ?? "unknown" })),
    setup_steps: ["npm install", "cp .env.example .env.local", "npx supabase db push", "npm run dev"],
    deploy_targets: ["Cloudflare Pages: npx wrangler pages deploy .next --project-name=" + project.name.toLowerCase().replace(/\s+/g, "-")],
  };

  const zipBuffer = await buildExportZip(
    files.map(f => ({ path: f.path, content: f.content ?? "", agent: f.agent_id ?? "unknown" })),
    manifest
  );

  const admin = createAdminClient();
  await admin.from("exports").insert({
    project_id: id,
    storage_path: `exports/${id}/${Date.now()}.zip`,
    file_count: files.length,
    size_bytes: zipBuffer.length,
    manifest,
  });

  const filename = `${project.name.toLowerCase().replace(/\s+/g, "-")}-export.zip`;
  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export const GET = POST;
