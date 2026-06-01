import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Zap, Clock, CheckCircle, AlertCircle, Archive, Search } from "lucide-react";
import type { Project } from "@/types/project";

const STATUS_CONFIG = {
  draft:      { color: "bg-white/20",        label: "Draft",      dot: "bg-white/30" },
  generating: { color: "bg-violet-400",       label: "Generating", dot: "bg-violet-400" },
  ready:      { color: "bg-emerald-400",      label: "Ready",      dot: "bg-emerald-400" },
  error:      { color: "bg-red-400",          label: "Error",      dot: "bg-red-400" },
  archived:   { color: "bg-white/10",         label: "Archived",   dot: "bg-white/20" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const list = (projects ?? []) as Project[];
  const ready      = list.filter(p => p.status === "ready").length;
  const generating = list.filter(p => p.status === "generating").length;

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Projects</h1>
          <p className="text-white/35 text-sm mt-1">
            {list.length} total
            {ready > 0 && <span className="text-emerald-400/70"> · {ready} ready</span>}
            {generating > 0 && <span className="text-violet-400/70"> · {generating} generating</span>}
          </p>
        </div>
        <Link href="/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-all px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-violet-500/20 hover:shadow-violet-500/30">
          <Plus className="w-4 h-4" /> New project
        </Link>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="border border-dashed border-white/[0.08] rounded-2xl p-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center mx-auto mb-5">
            <Zap className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Build your first app</h2>
          <p className="text-white/35 text-sm mb-7 max-w-xs mx-auto leading-relaxed">
            Describe an app in plain English. Agents generate the full codebase, ready to deploy.
          </p>
          <Link href="/new" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-all px-5 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/20">
            <Plus className="w-4 h-4" /> Create project
          </Link>
        </div>
      )}

      {/* Project grid */}
      {list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {list.map(project => {
            const cfg = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
            return (
              <Link key={project.id} href={`/projects/${project.id}`}
                className="group relative p-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.045] hover:border-white/[0.1] transition-all duration-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30">
                {/* Status bar on left edge */}
                <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${cfg.color} opacity-70`} />

                <div className="flex items-start justify-between mb-3 pl-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${project.status === "generating" ? "animate-pulse" : ""}`} />
                    <span className="text-xs text-white/35 font-medium">{cfg.label}</span>
                  </div>
                  {project.template && (
                    <span className="text-[11px] text-white/20 capitalize bg-white/5 px-2 py-0.5 rounded-md">
                      {project.template.replace(/-/g, " ")}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-[15px] mb-1.5 pl-1 group-hover:text-violet-200 transition-colors leading-snug">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-white/35 line-clamp-2 pl-1 leading-relaxed">{project.description}</p>
                )}
                <p className="text-xs text-white/20 mt-3 pl-1">{timeAgo(project.updated_at)}</p>
              </Link>
            );
          })}

          {/* New project card */}
          <Link href="/new"
            className="p-5 rounded-2xl border border-dashed border-white/[0.08] hover:border-violet-500/25 hover:bg-violet-500/[0.04] transition-all flex flex-col items-center justify-center gap-2.5 text-white/25 hover:text-violet-400 min-h-[140px] group">
            <div className="w-9 h-9 rounded-xl border border-dashed border-white/10 group-hover:border-violet-500/30 flex items-center justify-center transition-all">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">New project</span>
          </Link>
        </div>
      )}
    </div>
  );
}
