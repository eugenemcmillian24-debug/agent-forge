import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase.from("projects").select("*").eq("id", projectId).eq("user_id", user.id).single();
  if (!project) redirect("/dashboard");

  return <>{children}</>;
}
