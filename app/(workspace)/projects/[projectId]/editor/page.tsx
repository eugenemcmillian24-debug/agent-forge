import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function WorkspaceEditorPage({ params }: { params: { projectId: string } }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: project } = await supabase.from("projects").select("*").eq("id", params.projectId).single();
  if (!project) redirect("/dashboard");
  return <WorkspaceShell project={project} initialPanel="editor" />;
}
