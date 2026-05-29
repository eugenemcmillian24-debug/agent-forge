import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Zap, Clock, CheckCircle, AlertCircle, Archive } from "lucide-react";
import type { Project } from "@/types/project";

const STATUS_CONFIG = {
  draft:       { icon: Clock,         color: "text-white/40",  bg: "bg-white/5",        label: "Draft" },
  generating:  { icon: Zap,           color: "text-violet-400", bg: "bg-violet-500/10", label: "Generating" },
  ready:       { icon: CheckCircle,   color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Ready" },
  error:       { icon: AlertCircle,   color: "text-red-400",    bg: "bg-red-500/10",     label: "Error" },
  archived:    { icon: Archive,       color: "text-white/20",  bg: "bg-white/5",        label: "Archived" },
};

const TEMPLATES = ["saas-dashboard","ai-chat","crm","content-generator","marketplace","portfolio","custom"];

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

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-white/40 text-sm mt-1">{list.length} project{list.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/new"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New project
        </Link>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Build your first app</h2>
          <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">Describe an app in plain English. Agents generate the full codebase.</p>
          <Link href="/new" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors px-5 py-2.5 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Create project
          </Link>
        </div>
      )}

      {/* Project grid */}
      {list.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(project => {
            const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
            const Icon = cfg.icon;
            return (
              <Link key={project.id} href={`/projects/${project.id}`}
                className="group p-5 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-1 rounded-md text-xs flex items-center gap-1.5 ${cfg.bg} ${cfg.color}`}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </div>
                  {project.template && (
                    <span className="text-xs text-white/20 capitalize">{project.template.replace(/-/g," ")}</span>
                  )}
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-violet-300 transition-colors">{project.name}</h3>
                {project.description && <p className="text-sm text-white/40 line-clamp-2">{project.description}</p>}
                <p className="text-xs text-white/20 mt-3">{new Date(project.updated_at).toLocaleDateString()}</p>
              </Link>
            );
          })}
          {/* New project card */}
          <Link href="/new"
            className="p-5 rounded-2xl border border-dashed border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all flex flex-col items-center justify-center gap-2 text-white/30 hover:text-violet-400 min-h-[140px]">
            <Plus className="w-6 h-6" />
            <span className="text-sm">New project</span>
          </Link>
        </div>
      )}
    </div>
  );
}
