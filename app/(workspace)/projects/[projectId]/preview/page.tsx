import { createServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/utils/auth";
import { redirect } from "next/navigation";
import { PreviewPanel } from "@/components/workspace/PreviewPanel";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireAuth();
  if (!user) redirect("/login");

  const supabase = await createServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, metadata")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) redirect("/dashboard");

  const { data: files } = await supabase
    .from("project_files")
    .select("path, content, language")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("path");

  return (
    <PreviewPanel
      project={project}
      files={files ?? []}
    />
  );
}
