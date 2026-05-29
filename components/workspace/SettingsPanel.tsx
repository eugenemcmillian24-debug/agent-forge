"use client";
import { useEffect, useState } from "react";
import { Settings, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { useProviderHealth } from "@/hooks/useProviderHealth";

const PROVIDER_LABELS: Record<string, string> = {
  githubModels: "GitHub Models", openrouter: "OpenRouter",
  groq: "Groq", mistral: "Mistral", huggingface: "Hugging Face",
};

const PROVIDER_ROLES: Record<string, string> = {
  githubModels: "Orchestration, planning, docs — free tier",
  openrouter:   "Dynamic overflow, long context",
  groq:         "Fast QA and repair loops",
  mistral:      "Code generation (Codestral)",
  huggingface:  "Fallback inference",
};

export function SettingsPanel() {
  const { providers, testing, load, runHealthChecks } = useProviderHealth();
  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-base font-semibold flex items-center gap-2"><Settings className="w-4 h-4 text-violet-400" /> Provider Settings</h2>
        <p className="text-xs text-white/40 mt-1">Manage AI provider connections and routing preferences</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs text-white/40 font-medium uppercase tracking-wide">Provider Status</h3>
          <button onClick={runHealthChecks} disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40">
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {testing ? "Testing…" : "Test all"}
          </button>
        </div>

        {providers.length === 0 && (
          <div className="text-center py-8 text-white/20 text-sm">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading providers…
          </div>
        )}

        <div className="space-y-2">
          {providers.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${p.status === "ok" ? "bg-emerald-400" : p.status === "degraded" ? "bg-yellow-400" : p.status === "down" ? "bg-red-400" : "bg-white/20"}`} />
                <div>
                  <p className="text-sm font-medium">{PROVIDER_LABELS[p.id] ?? p.id}</p>
                  <p className="text-xs text-white/30">{PROVIDER_ROLES[p.id] ?? ""}</p>
                  {p.lastError && <p className="text-xs text-red-400 mt-0.5 truncate max-w-xs">{p.lastError}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {p.latency && <span className="text-xs text-white/30">{p.latency}ms</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : p.connected ? "bg-white/5 text-white/40" : "bg-white/5 text-white/20"}`}>
                  {p.status === "ok" ? "Connected" : p.connected ? "Configured" : "Not set"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Model matrix reference */}
        <div className="mt-6">
          <h3 className="text-xs text-white/40 font-medium uppercase tracking-wide mb-3">Default Model Routing</h3>
          <div className="space-y-1.5">
            {[
              { task: "Orchestrator",   provider: "GitHub Models", model: "gpt-4.1-mini" },
              { task: "Architecture",   provider: "GitHub Models", model: "deepseek-v3" },
              { task: "Frontend code",  provider: "Mistral",       model: "codestral-latest" },
              { task: "Backend code",   provider: "Mistral",       model: "mistral-medium-latest" },
              { task: "QA + Repair",    provider: "Groq",          model: "llama-3.3-70b-versatile" },
              { task: "Docs + Export",  provider: "GitHub Models", model: "phi-4" },
            ].map(({ task, provider, model }) => (
              <div key={task} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                <span className="text-xs text-white/50">{task}</span>
                <span className="text-xs font-mono text-white/30">{provider} / {model}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
