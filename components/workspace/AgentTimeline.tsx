"use client";
import { useTaskStatus } from "@/hooks/useTaskStatus";
import { CheckCircle, XCircle, Loader2, Clock, Zap } from "lucide-react";

const AGENT_LABELS: Record<string, string> = {
  product_manager: "Product Manager", architect: "Architect", uiux: "UI/UX",
  frontend: "Frontend", backend: "Backend", database: "Database",
  ai_integration: "AI Integration", github_agent: "GitHub", cloudflare_deploy: "Cloudflare",
  qa: "QA", repair: "Repair", export_agent: "Export", orchestrator: "Orchestrator",
};

const AGENT_COLORS: Record<string, string> = {
  orchestrator: "text-violet-400", frontend: "text-cyan-400", backend: "text-blue-400",
  database: "text-emerald-400", qa: "text-yellow-400", repair: "text-orange-400",
};

export function AgentTimeline({ projectId }: { projectId: string }) {
  const { tasks, loading } = useTaskStatus(projectId, 2000);

  const running   = tasks.filter(t => t.status === "running").length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const failed    = tasks.filter(t => t.status === "failed").length;
  const pending   = tasks.filter(t => t.status === "pending").length;
  const total     = tasks.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center justify-between shrink-0 bg-[#0c0c14]">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-sm font-medium">Agent Activity</span>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3 text-xs">
            {running   > 0 && <span className="text-violet-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />{running} running</span>}
            {completed > 0 && <span className="text-emerald-400">{completed} done</span>}
            {failed    > 0 && <span className="text-red-400">{failed} failed</span>}
            {pending   > 0 && <span className="text-white/30">{pending} pending</span>}
          </div>
        )}
      </div>

      {/* Progress bar (overall) */}
      {total > 0 && (
        <div className="px-4 pt-2.5 pb-1 shrink-0">
          <div className="progress-bar h-1">
            <div
              className="progress-bar-fill bg-gradient-to-r from-violet-500 to-indigo-500"
              style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
            />
            {running > 0 && <div className="progress-bar-indeterminate absolute inset-0" />}
          </div>
          <p className="text-[10px] text-white/20 mt-1">{completed}/{total} tasks complete</p>
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && tasks.length === 0 && (
          <div className="text-center py-12 text-white/20">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-violet-400/30" />
            <p className="text-sm">Loading…</p>
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="text-center py-14 text-white/20">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-violet-400/30" />
            </div>
            <p className="text-sm font-medium mb-1">No agent runs yet</p>
            <p className="text-xs text-white/15">Describe your app above to start generation</p>
          </div>
        )}

        {tasks.map(task => (
          <div key={task.id} className={`task-card ${task.status}`}>
            {/* Status icon */}
            <div className="mt-0.5 shrink-0">
              {task.status === "running"   && <Loader2   className="w-4 h-4 text-violet-400 animate-spin" />}
              {task.status === "completed" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              {task.status === "failed"    && <XCircle   className="w-4 h-4 text-red-400" />}
              {task.status === "pending"   && <Clock     className="w-4 h-4 text-white/20" />}
              {task.status === "skipped"   && <Clock     className="w-4 h-4 text-white/10" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{task.title}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full bg-white/5 shrink-0 ${
                  AGENT_COLORS[task.assigned_agent] ?? "text-white/30"
                }`}>
                  {AGENT_LABELS[task.assigned_agent] ?? task.assigned_agent}
                </span>
              </div>

              {/* Per-task progress bar for running tasks */}
              {task.status === "running" && (
                <div className="progress-bar h-0.5 mt-1.5 w-full progress-bar-indeterminate" />
              )}

              {/* Provider / model / tokens */}
              {(task.provider || task.model) && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[11px] text-white/25 font-mono">
                    {task.provider}/{task.model}
                  </span>
                  {(task.tokens_used ?? 0) > 0 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-white/25">
                      {(task.tokens_used ?? 0).toLocaleString()} tok
                    </span>
                  )}
                  {(task.latency_ms ?? 0) > 0 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-white/25">
                      {task.latency_ms ?? 0}ms
                    </span>
                  )}
                </div>
              )}

              {task.errors?.length > 0 && (
                <p className="text-xs text-red-400/80 mt-1 truncate">{task.errors[0]}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
