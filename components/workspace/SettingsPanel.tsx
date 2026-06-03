"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Settings, CheckCircle, XCircle, Loader2, RefreshCw, Zap,
  AlertTriangle, Wifi, Key, Eye, EyeOff, Plus, Trash2, Check, Webhook,
} from "lucide-react";
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

const PROVIDER_KEY_HINTS: Record<string, { placeholder: string; docsUrl: string }> = {
  githubModels: { placeholder: "ghp_...", docsUrl: "https://github.com/settings/tokens" },
  openrouter:   { placeholder: "sk-or-...", docsUrl: "https://openrouter.ai/keys" },
  groq:         { placeholder: "gsk_...", docsUrl: "https://console.groq.com/keys" },
  mistral:      { placeholder: "your-mistral-key", docsUrl: "https://console.mistral.ai/api-keys" },
  huggingface:  { placeholder: "hf_...", docsUrl: "https://huggingface.co/settings/tokens" },
};

const MODEL_ROUTING = [
  { task: "Orchestrator",  role: "Planning & DAG",       provider: "GitHub Models", model: "gpt-4.1-mini",             color: "text-violet-400" },
  { task: "Architecture",  role: "System design",         provider: "GitHub Models", model: "deepseek-v3",              color: "text-blue-400"   },
  { task: "Frontend",      role: "UI code generation",    provider: "Mistral",       model: "codestral-latest",         color: "text-cyan-400"   },
  { task: "Backend",       role: "API & server code",     provider: "Mistral",       model: "mistral-medium-latest",    color: "text-blue-400"   },
  { task: "QA + Repair",   role: "Validation & fixes",    provider: "Groq",          model: "llama-3.3-70b-versatile",  color: "text-orange-400" },
  { task: "Docs + Export", role: "Documentation",         provider: "GitHub Models", model: "phi-4",                    color: "text-emerald-400"},
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

interface KeyEntry { provider: string; label: string; masked: string; }

function KeyManager() {
  const [keys,     setKeys]     = useState<KeyEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState<string | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [keyLabel, setKeyLabel] = useState("");
  const [showKey,  setShowKey]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/keys");
      if (res.ok) setKeys(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function handleSaveKey() {
    if (!adding || !keyValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: adding, key: keyValue.trim(), label: keyLabel || undefined }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setAdding(null); setKeyValue(""); setKeyLabel("");
        loadKeys();
      }
    } finally { setSaving(false); }
  }

  async function handleDelete(provider: string) {
    if (!confirm(`Remove ${PROVIDER_LABELS[provider]} key?`)) return;
    setDeleting(provider);
    try {
      await fetch("/api/settings/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      loadKeys();
    } finally { setDeleting(null); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] text-white/30 font-semibold tracking-widest uppercase">Your API Keys</h3>
        <span className="text-[10px] text-white/20">Encrypted at rest · Never logged</span>
      </div>

      {loading ? (
        <div className="text-center py-6 text-white/20"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-2">
          {Object.keys(PROVIDER_LABELS).map(provider => {
            const existing = keys.find(k => k.provider === provider);
            const hint = PROVIDER_KEY_HINTS[provider];
            const isAdding = adding === provider;
            return (
              <div key={provider} className="rounded-xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Key className={`w-3.5 h-3.5 shrink-0 ${existing ? "text-emerald-400" : "text-white/20"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{PROVIDER_LABELS[provider]}</p>
                      {existing
                        ? <p className="text-xs text-white/30 font-mono mt-0.5">{existing.masked}</p>
                        : <p className="text-xs text-white/25 mt-0.5">Not configured</p>
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {existing ? (
                      <button onClick={() => handleDelete(provider)} disabled={deleting === provider}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        {deleting === provider
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    ) : (
                      <button onClick={() => setAdding(isAdding ? null : provider)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 border border-violet-500/20 transition-all">
                        <Plus className="w-3 h-3" /> Add key
                      </button>
                    )}
                  </div>
                </div>
                {isAdding && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/[0.04] space-y-2.5">
                    <div className="relative">
                      <input type={showKey ? "text" : "password"} value={keyValue}
                        onChange={e => setKeyValue(e.target.value)}
                        placeholder={hint.placeholder} autoFocus
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/30 pr-9" />
                      <button type="button" onClick={() => setShowKey(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50">
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input type="text" value={keyLabel} onChange={e => setKeyLabel(e.target.value)}
                      placeholder="Label (optional, e.g. 'Personal')"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                    <div className="flex items-center gap-2">
                      <button onClick={handleSaveKey} disabled={!keyValue.trim() || saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-all font-medium">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                        {saving ? "Saving…" : saved ? "Saved!" : "Save key"}
                      </button>
                      <a href={hint.docsUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-2">
                        Get API key ↗
                      </a>
                      <button onClick={() => { setAdding(null); setKeyValue(""); }}
                        className="ml-auto text-xs text-white/25 hover:text-white/50">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Webhook configuration section ─────────────────────────────────────────────
const WEBHOOK_EVENTS = [
  { id: "generation.completed", label: "Generation completed" },
  { id: "generation.failed",    label: "Generation failed"    },
  { id: "deploy.completed",     label: "Deploy completed"     },
] as const;

function WebhookManager({ projectId }: { projectId: string }) {
  const [url,      setUrl]      = useState("");
  const [secret,   setSecret]   = useState("");
  const [events,   setEvents]   = useState<string[]>(["generation.completed"]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hasWebhook, setHasWebhook] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/webhook`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setUrl(d.url ?? "");
          setEvents(d.events ?? ["generation.completed"]);
          setHasWebhook(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleSave() {
    if (!url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), secret: secret || undefined, events }),
      });
      if (res.ok) {
        setSaved(true);
        setHasWebhook(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally { setSaving(false); }
  }

  async function handleRemove() {
    if (!confirm("Remove webhook?")) return;
    setRemoving(true);
    try {
      await fetch(`/api/projects/${projectId}/webhook`, { method: "DELETE" });
      setUrl(""); setSecret(""); setHasWebhook(false);
    } finally { setRemoving(false); }
  }

  function toggleEvent(id: string) {
    setEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] text-white/30 font-semibold tracking-widest uppercase">Webhook</h3>
        {hasWebhook && <span className="badge badge-emerald">Active</span>}
      </div>

      {loading ? (
        <div className="text-center py-4 text-white/20"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
      ) : (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-white/40 font-medium">Endpoint URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://your-app.com/webhooks/agentforge"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-white/40 font-medium">Signing secret <span className="text-white/20">(optional)</span></label>
            <input type="password" value={secret} onChange={e => setSecret(e.target.value)}
              placeholder="whsec_..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-white/40 font-medium">Events</label>
            <div className="space-y-1">
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={events.includes(ev.id)} onChange={() => toggleEvent(ev.id)}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-violet-500" />
                  <span className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={!url.trim() || saving || events.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-all font-medium">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : <Webhook className="w-3 h-3" />}
              {saving ? "Saving…" : saved ? "Saved!" : hasWebhook ? "Update" : "Save webhook"}
            </button>
            {hasWebhook && (
              <button onClick={handleRemove} disabled={removing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all">
                {removing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsPanel({ projectId }: { projectId: string }) {
  const { providers, testing, load, runHealthChecks } = useProviderHealth();
  useEffect(() => { load(); }, [load]);

  const connectedCount = providers.filter(p => p.connected).length;
  const healthyCount   = providers.filter(p => p.status === "ok").length;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-violet-500/12 border border-violet-500/15 flex items-center justify-center">
            <Settings className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <h2 className="text-base font-semibold">Provider Settings</h2>
        </div>
        <p className="text-xs text-white/35 ml-9">Manage AI provider connections, API keys, routing, and webhooks</p>
      </div>

      <div className="p-6 space-y-8">
        {/* Summary stats */}
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

        {/* API Keys */}
        <KeyManager />

        {/* Provider Status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] text-white/30 font-semibold tracking-widest uppercase">Provider Status</h3>
            <button onClick={runHealthChecks} disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/35 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.07] transition-all disabled:opacity-40">
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
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
              {providers.map(p => (
                <div key={p.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09] hover:bg-white/[0.03] transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon status={p.status ?? ""} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{PROVIDER_LABELS[p.id] ?? p.id}</p>
                      <p className="text-xs text-white/30 mt-0.5 truncate">{PROVIDER_ROLES[p.id] ?? ""}</p>
                      {p.lastError && <p className="text-xs text-red-400/80 mt-1 truncate max-w-xs">{p.lastError}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    {p.latency && <span className="text-xs text-white/25 font-mono tabular-nums">{p.latency}ms</span>}
                    <StatusBadge status={p.status ?? ""} connected={p.connected} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Model routing */}
        <div>
          <h3 className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-3">Default Model Routing</h3>
          <div className="rounded-xl border border-white/[0.05] overflow-hidden">
            {MODEL_ROUTING.map(({ task, role, provider, model, color }, i) => (
              <div key={task}
                className={`flex items-center justify-between px-4 py-3 gap-3 ${i < MODEL_ROUTING.length - 1 ? "border-b border-white/[0.04]" : ""} hover:bg-white/[0.02] transition-colors`}>
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
        </div>

        {/* Webhook */}
        <WebhookManager projectId={projectId} />
      </div>
    </div>
  );
}
