import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Bot, FileCode, Folder, ExternalLink } from "lucide-react";
import Link from "next/link";

interface PageProps { params: Promise<{ slug: string }> }

export default async function SharePage({ params }: PageProps) {
  const { slug } = await params;
  const admin = createAdminClient();

  // Find project by share slug
  const { data: projects } = await admin
    .from("projects")
    .select("id, name, description, template, status, metadata, created_at")
    .eq("metadata->>share_slug", slug)
    .eq("metadata->>is_public", "true")
    .limit(1);

  const project = projects?.[0];
  if (!project) notFound();

  // Fetch files
  const { data: files } = await admin
    .from("project_files")
    .select("id, path, language, agent_id, content")
    .eq("project_id", project.id)
    .eq("is_deleted", false)
    .order("path");

  // Group by directory
  const dirs: Record<string, typeof files> = {};
  for (const f of files ?? []) {
    const parts = f.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
    if (!dirs[dir]) dirs[dir] = [];
    dirs[dir]!.push(f);
  }

  const LANG_BADGE: Record<string, string> = {
    typescript: "bg-blue-500/10 text-blue-400",
    javascript: "bg-yellow-500/10 text-yellow-400",
    css:        "bg-pink-500/10 text-pink-400",
    sql:        "bg-purple-500/10 text-purple-400",
    markdown:   "bg-white/5 text-white/40",
    yaml:       "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.05] px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white/70">AgentForge</span>
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/60 font-medium">{project.name}</span>
        <span className="ml-auto text-xs text-white/25 border border-white/10 px-2 py-0.5 rounded-full">
          Read-only share
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Project info */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-white/50 text-sm leading-relaxed max-w-2xl">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {project.template && project.template !== "custom" && (
                <span className="badge badge-violet capitalize">{project.template.replace(/-/g, " ")}</span>
              )}
              <span className={`badge ${project.status === "ready" ? "badge-emerald" : "badge-white"}`}>
                {project.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-white/25">
            <span>{(files ?? []).length} files generated</span>
            <span>·</span>
            <span>Built with AgentForge</span>
            <span>·</span>
            <Link href="/dashboard" className="text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
              Build your own <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* File browser */}
        {(files ?? []).length === 0 ? (
          <div className="text-center py-16 text-white/20">
            <FileCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No files in this project yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(dirs).map(([dir, dirFiles]) => (
              <div key={dir}>
                {dir !== "(root)" && (
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="w-3.5 h-3.5 text-white/25" />
                    <span className="text-xs font-mono text-white/35">{dir}/</span>
                  </div>
                )}
                <div className="grid gap-2">
                  {(dirFiles ?? []).map(file => {
                    const filename = file.path.split("/").pop() ?? file.path;
                    const lang = file.language ?? "text";
                    const langClass = LANG_BADGE[lang] ?? "bg-white/5 text-white/30";
                    const lines = (file.content ?? "").split("\n").length;
                    return (
                      <div key={file.id}
                        className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileCode className="w-3.5 h-3.5 text-white/25 shrink-0" />
                          <span className="text-sm font-mono text-white/70 truncate">{filename}</span>
                          {file.agent_id && (
                            <span className="text-[10px] text-white/20 shrink-0">by {file.agent_id}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-[10px] text-white/20 tabular-nums">{lines} lines</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${langClass}`}>{lang}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
