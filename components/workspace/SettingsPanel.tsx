"use client";
import { useEffect } from "react";
import { Settings, CheckCircle, XCircle, Loader2, RefreshCw, Zap, AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { useProviderHealth } from "@/hooks/useProviderHealth";

const PROVIDER_LABELS: Record<string, string> = {
  githubModels: "GitHub Models",
  openrouter:   "OpenRouter",
  groq:         "Groq",
  mistral:      "Mistral",
  huggingface:  "Hugging Face",
};

const PROVIDER_ROLES: Record<string, string> = {
  githubModels: "Orchestration, planning, docs — free tier",
  openrouter:   "Dynamic overflow, long context",
  groq:         "Fast QA and repair loops",
  mistral:      "Code generation (Codestral)",
  huggingface:  "Fallback inference",
};

const PROVIDER_COLORS: Record<string, { dot: string; badge: string }> = {
  githubModels: { dot: "bg-white/50",    badge: "badge-white"   },
  openrouter:   { dot: "bg-violet-400",  badge: "badge-violet"  },
  groq:         { dot: "bg-orange-400",  badge: "badge-white"   },
  mistral:      { dot: "bg-blue-400",    badge: "badge-blue"    },
  huggingface:  { dot: "bg-yellow-400",  badge: "badge-white"   },
};

const MODEL_ROUTING = [
  { task: "Orchestrator",  role: "Planning & DAG",       provider: "GitHub Models", model: "gpt-4.1-mini",              color: "text-violet-400" },
  { task: "Architecture",  role: "System design",         provider: "GitHub Models", model: "deepseek-v3",               color: "text-blue-400"   },
  { task: "Frontend",      role: "UI code generation",    provider: "Mistral",       model: "codestral-latest",          color: "text-cyan-400"   },
  { task: "Backend",       role: "API & server code",     provider: "Mistral",       model: "mistral-medium-latest",     color: "text-blue-400"   },
  { task: "QA + Repair",   role: "Validation & fixes",    provider: "Groq",          model: "llama-3.3-70b-versatile",  color: "text-orange-400" },
  { task: "Docs + Export", role: "Documentation",         provider: "GitHub Models", model: "phi-4",                     color: "text-emerald-400"},
];

function StatusIcon({ status }: { status: string }) {
  if (status === "ok")       return <CheckCircle  className="w-4 h-4 text-emerald-400 shrink-0" />;
  if (status === "degraded") return <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />;
  if (status === "down")     return <XCircle      className="w-4 h-4 text-red-400 shrink-0" />;
  return <div className="w-4 h-4 rounded-full border border-white/15 shrink-0" />;
}

function StatusBadge({ status, connected }: { status: string; connected: boolean }) {
  if (status === "ok")       return <span className="badge badge-emerald">Connected</span>;
  if (status === "degraded") return <span className="badge" style={{ background: "rgba(234,179,8,0.12)", color: "#fde047", border: "1px solid rgba(234,179,8,0.2)" }}>Degraded</span>;
  if (status === "down")     return <span className="badge badge-red">Down</span>;
  if (connected)             return <span className="badge badge-white">Configured</span>;
  return <span className="badge badge-white" style={{ opacity: 0.5 }}>Not set</span>;
}

export function SettingsPanel() {
  const { providers, testing, load, runHealthChecks } = useProviderHealth();
  useEffect(() => { load(); }, [load]);

  const connectedCount = providers.filter(p => p.connected).length;
  const healthyCount   = providers.filter(p => p.status === "ok").length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">

      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-violet-500/12 border border-violet-500/15 flex items-center justify-center">
            <Settings className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <h2 className="text-base font-semibold">Provider Settings</h2>
        </div>
        <p className="text-xs text-white/35 ml-9">Manage AI provider connections and routing preferences</p>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Summary stats ── */}
        {providers.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-white/40">Connected</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{connectedCount}<span className="text-sm font-normal text-white/25">/{providers.length}</span></p>
            </div>
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-white/40">Healthy</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{healthyCount}<span className="text-sm font-normal text-white/25">/{providers.length}</span></p>
            </div>
          </div>
        )}

        {/* ── Provider status ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] text-white/30 font-semibold tracking-widest uppercase">Provider Status</h3>
            <button onClick={runHealthChecks} disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/35 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.07] transition-all disabled:opacity-40">
              {testing
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />
              }
              {testing ? "Testing…" : "Test all"}
            </button>
          </div>

          {providers.length === 0 ? (
            <div className="text-center py-10 text-white/20">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2.5 text-violet-400/30" />
              <p className="text-sm">Loading providers…</p>
            </div>
          ) : (
            <div className="space-y-2">
              {providers.map(p => {
                const colors = PROVIDER_COLORS[p.id] ?? { dot: "bg-white/20", badge: "badge-white" };
                return (
                  <div key={p.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09] hover:bg-white/[0.03] transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusIcon status={p.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight">{PROVIDER_LABELS[p.id] ?? p.id}</p>
                        <p className="text-xs text-white/30 mt-0.5 truncate">{PROVIDER_ROLES[p.id] ?? ""}</p>
                        {p.lastError && (
                          <p className="text-xs text-red-400/80 mt-1 truncate max-w-xs">{p.lastError}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      {p.latency && (
                        <span className="text-xs text-white/25 font-mono tabular-nums">{p.latency}ms</span>
                      )}
                      <StatusBadge status={p.status} connected={p.connected} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Model routing table ── */}
        <div>
          <h3 className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-3">Default Model Routing</h3>
          <div className="rounded-xl border border-white/[0.05] overflow-hidden">
            {MODEL_ROUTING.map(({ task, role, provider, model, color }, i) => (
              <div key={task}
                className={`flex items-center justify-between px-4 py-3 gap-3 ${
                  i < MODEL_ROUTING.length - 1 ? "border-b border-white/[0.04]" : ""
                } hover:bg-white/[0.02] transition-colors`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.replace("text-", "bg-")}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${color}`}>{task}</p>
                    <p className="text-[11px] text-white/25 truncate">{role}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-white/40 font-medium">{provider}</p>
                  <p className="text-[11px] font-mono text-white/25">{model}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-white/20 mt-2 leading-relaxed">
            Routing adapts automatically based on provider availability. Configure keys in <code className="text-white/35 bg-white/[0.04] px-1.5 py-0.5 rounded">.env.local</code>.
          </p>
        </div>

      </div>
    </div>
  );
}
