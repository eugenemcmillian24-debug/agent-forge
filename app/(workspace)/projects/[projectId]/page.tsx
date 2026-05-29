import { redirect } from "next/navigation";
export default function WorkspaceRoot({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}/chat`);
}
