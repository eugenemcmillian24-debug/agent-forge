"use client";
import { useTaskStatus } from "@/hooks/useTaskStatus";
import { CheckCircle, XCircle, Loader2, Clock, Zap } from "lucide-react";

const AGENT_LABELS: Record<string, string> = {
  product_manager: "Product Manager", architect: "Architect", uiux: "UI/UX",
  frontend: "Frontend", backend: "Backend", database: "Database",
  ai_integration: "AI Integration", github_agent: "GitHub", cloudflare_deploy: "Cloudflare",
  qa: "QA", repair: "Repair", export_agent: "Export", orchestrator: "Orchestrator",
};

export function AgentTimeline({ projectId }: { projectId: string }) {
  const { tasks, loading } = useTaskStatus(projectId, 2000);

  const running   = tasks.filter(t => t.status === "running");
  const completed = tasks.filter(t => t.status === "completed");
  const failed    = tasks.filter(t => t.status === "failed");
  const pending   = tasks.filter(t => t.status === "pending");

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium">Agent Activity</span>
        </div>
        {tasks.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-white/40">
            {running.length   > 0 && <span className="text-violet-400">{running.length} running</span>}
            {completed.length > 0 && <span className="text-emerald-400">{completed.length} done</span>}
            {failed.length    > 0 && <span className="text-red-400">{failed.length} failed</span>}
            {pending.length   > 0 && <span>{pending.length} pending</span>}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && tasks.length === 0 && (
          <div className="text-center py-12 text-white/20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading…</p>
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="text-center py-12 text-white/20">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium mb-1">No agent runs yet</p>
            <p className="text-xs">Describe your app above to start generation</p>
          </div>
        )}

        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
              task.status === "running"   ? "border-violet-500/30 bg-violet-500/5" :
              task.status === "completed" ? "border-emerald-500/20 bg-emerald-500/5" :
              task.status === "failed"    ? "border-red-500/20 bg-red-500/5" :
              "border-white/5 bg-white/[0.02]"
            }`}>
              <div className="mt-0.5 shrink-0">
                {task.status === "running"   && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
                {task.status === "completed" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {task.status === "failed"    && <XCircle className="w-4 h-4 text-red-400" />}
                {task.status === "pending"   && <Clock className="w-4 h-4 text-white/20" />}
                {task.status === "skipped"   && <Clock className="w-4 h-4 text-white/10" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{task.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/30 shrink-0">
                    {AGENT_LABELS[task.assigned_agent] ?? task.assigned_agent}
                  </span>
                </div>
                {(task.provider || task.model) && (
                  <p className="text-xs text-white/30 mt-0.5 font-mono">
                    {task.provider}/{task.model}
                    {task.tokens_used ? ` · ${task.tokens_used.toLocaleString()} tokens` : ""}
                    {task.latency_ms  ? ` · ${task.latency_ms}ms` : ""}
                  </p>
                )}
                {task.errors?.length > 0 && (
                  <p className="text-xs text-red-400 mt-1 truncate">{task.errors[0]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
