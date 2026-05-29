import { redirect } from "next/navigation";
export default function WorkspaceRoot({ params }: { params: Promise<{ projectId: string }> }) {
  redirect(`/projects/${projectId}/chat`);
}
