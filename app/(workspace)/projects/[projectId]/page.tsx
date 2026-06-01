import { redirect } from "next/navigation";

type Panel = "chat" | "editor" | "preview" | "deploy" | "history" | "settings";
const VALID_PANELS: Panel[] = ["chat", "editor", "preview", "deploy", "history", "settings"];

export default async function WorkspaceRoot({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ panel?: string }>;
}) {
  const { projectId } = await params;
  const { panel } = await searchParams;
  const target: Panel = VALID_PANELS.includes(panel as Panel) ? (panel as Panel) : "chat";
  redirect(`/projects/${projectId}/${target}`);
}
