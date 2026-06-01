import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import type { Project } from "@/types/project";

interface Props {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const supabase = await createServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name, description")
    .eq("id", projectId)
    .single();

  if (!project) return { title: "Project — AgentForge" };

  return {
    title: `${project.name} — AgentForge`,
    description: project.description ?? `Building ${project.name} with AgentForge`,
  };
}

export default async function WorkspaceLayout({ children, params }: Props) {
  const { projectId } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  // Show 404 instead of silent redirect for deleted/unauthorized projects
  if (!project) notFound();

  return <>{children}</>;
}
