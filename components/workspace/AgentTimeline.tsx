"use client";
import { useState } from "react";
import { useTaskStatus } from "@/hooks/useTaskStatus";
import { CheckCircle, XCircle, Loader2, Clock, Zap, Activity, ChevronDown } from "lucide-react";

const AGENT_LABELS: Record<string, string> = {
  product_manager: "Product Manager", architect: "Architect", uiux: "UI/UX",
  frontend: "Frontend", backend: "Backend", database: "Database",
  ai_integration: "AI Integration", github_agent: "GitHub", cloudflare_deploy: "Cloudflare",
  qa: "QA", repair: "Repair", export_agent: "Export", orchestrator: "Orchestrator",
};

const AGENT_BADGE: Record<string, string> = {
  orchestrator:    "badge-violet",
  frontend:        "badge-blue",
  backend:         "badge-blue",
  database:        "badge-emerald",
  qa:              "badge-white",
  repair:          "badge-red",
  uiux:            "badge-violet",
  product_manager: "badge-white",
  architect:       "badge-blue",
};

function TaskErrors({ errors }: { errors: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!errors.length) return null;

  if (errors.length === 1) {
    return <p className="text-xs text-red-400/80 mt-1.5 font-mono leading-relaxed">{errors[0]}</p>;
  }

  return (
    <div className="mt-1.5">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs text-red-400/80 hover:text-red-400 transition-colors">
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {errors.length} errors
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1 pl-2 border-l border-red-500/20">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-400/70 font-mono leading-relaxed">{err}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentTimeline({ projectId }: { projectId: string }) {
  const { tasks, loading } = useTaskStatus(projectId, 2000);

  const running   = tasks.filter(t => t.status === "running").length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const failed    = tasks.filter(t => t.status === "failed").length;
  const pending   = tasks.filter(t => t.status === "pending").length;
  const total     = tasks.length;
  const progress  = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between shrink-0 bg-[#0b0b14]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Activity className="w-3 h-3 text-violet-400" />
          </div>
          <span className="text-sm font-semibold">Agent Activity</span>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3 text-xs">
            {running   > 0 && <span className="flex items-center gap-1 text-violet-300"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />{running} running</span>}
            {completed > 0 && <span className="text-emerald-400/80">{completed} done</span>}
            {failed    > 0 && <span className="text-red-400/80">{failed} failed</span>}
            {pending   > 0 && <span className="text-white/25">{pending} pending</span>}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/25 font-medium">{completed}/{total} tasks</span>
            <span className="text-[10px] text-white/25 tabular-nums">{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar h-1.5">
            <div className="progress-bar-fill bg-gradient-to-r from-violet-500 to-indigo-400" style={{ width: `${progress}%` }} />
            {running > 0 && <div className="progress-bar-indeterminate absolute inset-0 rounded-full" />}
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && tasks.length === 0 && (
          <div className="text-center py-14 text-white/20">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-violet-400/30" />
            <p className="text-sm">Loading…</p>
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="text-center py-16 text-white/20">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-violet-400/25" />
            </div>
            <p className="text-sm font-medium mb-1.5 text-white/25">No agent runs yet</p>
            <p className="text-xs text-white/15 leading-relaxed">Describe your app above<br />to start generation</p>
          </div>
        )}

        {tasks.map((task, idx) => (
          <div key={task.id} className="task-card" style={{ animationDelay: `${idx * 40}ms` }}>
            {/* Status icon */}
            <div className="mt-0.5 shrink-0 w-4">
              {task.status === "running"   && <Loader2     className="w-4 h-4 text-violet-400 animate-spin" />}
              {task.status === "completed" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {task.status === "failed"    && <XCircle     className="w-4 h-4 text-red-400" />}
              {task.status === "pending"   && <Clock       className="w-4 h-4 text-white/20" />}
              {task.status === "skipped"   && <Clock       className="w-4 h-4 text-white/10" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium truncate leading-tight">{task.title}</span>
                <span className={`badge ${AGENT_BADGE[task.assigned_agent] ?? "badge-white"} shrink-0`}>
                  {AGENT_LABELS[task.assigned_agent] ?? task.assigned_agent}
                </span>
              </div>

              {task.status === "running" && (
                <div className="progress-bar h-0.5 mt-1 w-full progress-bar-indeterminate rounded-full" />
              )}

              {(task.provider || task.model) && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[11px] text-white/20 font-mono">{task.provider}/{task.model}</span>
                  {(task.tokens_used ?? 0) > 0 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-white/25 tabular-nums">
                      {(task.tokens_used ?? 0).toLocaleString()} tok
                    </span>
                  )}
                  {(task.latency_ms ?? 0) > 0 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-white/25 tabular-nums">
                      {task.latency_ms}ms
                    </span>
                  )}
                </div>
              )}

              <TaskErrors errors={task.errors ?? []} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
