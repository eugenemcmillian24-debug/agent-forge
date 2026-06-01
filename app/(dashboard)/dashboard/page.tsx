import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Zap, CheckCircle, AlertCircle, Clock, Search } from "lucide-react";
import type { Project } from "@/types/project";

const STATUS_CONFIG = {
  draft:      { label: "Draft",      dotClass: "bg-white/30",   badgeClass: "badge-white",   barClass: "bg-white/20"   },
  generating: { label: "Generating", dotClass: "bg-violet-400", badgeClass: "badge-violet",  barClass: "bg-violet-400" },
  ready:      { label: "Ready",      dotClass: "bg-emerald-400",badgeClass: "badge-emerald", barClass: "bg-emerald-400"},
  error:      { label: "Error",      dotClass: "bg-red-400",    badgeClass: "badge-red",     barClass: "bg-red-400"    },
  archived:   { label: "Archived",   dotClass: "bg-white/15",   badgeClass: "badge-white",   barClass: "bg-white/10"   },
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

  const list      = (projects ?? []) as Project[];
  const ready      = list.filter(p => p.status === "ready").length;
  const generating = list.filter(p => p.status === "generating").length;
  const errors     = list.filter(p => p.status === "error").length;

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Projects</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-white/30 text-sm">{list.length} total</span>
            {ready > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-400/80">
                <CheckCircle className="w-3 h-3" /> {ready} ready
              </span>
            )}
            {generating > 0 && (
              <span className="flex items-center gap-1 text-xs text-violet-400/80">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" /> {generating} running
              </span>
            )}
            {errors > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400/80">
                <AlertCircle className="w-3 h-3" /> {errors} error{errors > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <Link href="/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-all px-4 py-2 rounded-lg text-sm font-medium shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 group">
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          New project
        </Link>
      </div>

      {/* ── Empty state ── */}
      {list.length === 0 && (
        <div className="border border-dashed border-white/[0.07] rounded-2xl p-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center mx-auto mb-5">
            <Zap className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Build your first app</h2>
          <p className="text-white/35 text-sm mb-7 max-w-xs mx-auto leading-relaxed">
            Describe an app in plain English. Agents generate the full codebase, ready to deploy.
          </p>
          <Link href="/new"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-all px-5 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-violet-500/20">
            <Plus className="w-4 h-4" /> Create project
          </Link>
        </div>
      )}

      {/* ── Project grid ── */}
      {list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {list.map(project => {
            const cfg = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
            return (
              <Link key={project.id} href={`/projects/${project.id}`}
                className="group relative p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-200 overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30">

                {/* Left status bar */}
                <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${cfg.barClass} opacity-60`} />

                {/* Top row */}
                <div className="flex items-center justify-between mb-3 pl-2">
                  <span className={`badge ${cfg.badgeClass} flex items-center gap-1.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass} ${project.status === "generating" ? "animate-pulse" : ""}`} />
                    {cfg.label}
                  </span>
                  {project.template && (
                    <span className="text-[11px] text-white/20 capitalize bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                      {project.template.replace(/-/g, " ")}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-semibold text-[15px] mb-1.5 pl-2 group-hover:text-violet-200 transition-colors leading-snug line-clamp-1">
                  {project.name}
                </h3>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-white/35 line-clamp-2 pl-2 leading-relaxed">{project.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pl-2">
                  <span className="flex items-center gap-1 text-xs text-white/20">
                    <Clock className="w-3 h-3" />
                    {timeAgo(project.updated_at)}
                  </span>
                  <span className="text-xs text-white/15 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open →
                  </span>
                </div>
              </Link>
            );
          })}

          {/* New project card */}
          <Link href="/new"
            className="p-5 rounded-2xl border border-dashed border-white/[0.07] hover:border-violet-500/25 hover:bg-violet-500/[0.04] transition-all flex flex-col items-center justify-center gap-3 text-white/20 hover:text-violet-400 min-h-[160px] group">
            <div className="w-10 h-10 rounded-xl border border-dashed border-white/[0.08] group-hover:border-violet-500/30 flex items-center justify-center transition-all">
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
            </div>
            <span className="text-sm font-medium">New project</span>
          </Link>
        </div>
      )}
    </div>
  );
}
