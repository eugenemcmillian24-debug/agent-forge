"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Zap, ChevronDown, Check, RefreshCw, DollarSign, Clock, Loader2 } from "lucide-react";
import { useAgentStream } from "@/hooks/useAgentStream";
import { useToast } from "@/lib/toast";

const PROFILES = [
  { id: "free_tier",  label: "Free Tier",  desc: "GitHub Models first",  color: "text-emerald-400", dot: "bg-emerald-400" },
  { id: "balanced",   label: "Balanced",   desc: "OpenRouter + GitHub",  color: "text-violet-400",  dot: "bg-violet-400"  },
  { id: "fast_build", label: "Fast Build", desc: "Groq first",           color: "text-orange-400",  dot: "bg-orange-400"  },
  { id: "quality",    label: "Quality",    desc: "Mistral first",        color: "text-blue-400",    dot: "bg-blue-400"    },
];

const MAX = 5000;

interface CostEstimate {
  complexity: string;
  taskCount: number;
  tokens: { total: number };
  cost: { estimated_usd: number; is_free: boolean; provider: string };
  time: { estimated_label: string };
}

export function PromptBar({ projectId, onGenerating }: { projectId: string; onGenerating: (v: boolean) => void }) {
  const [prompt,      setPrompt]      = useState("");
  const [profile,     setProfile]     = useState("balanced");
  const [showProf,    setShowProf]    = useState(false);
  const [partialMode, setPartialMode] = useState(false);
  const [estimate,    setEstimate]    = useState<CostEstimate | null>(null);
  const [estimating,  setEstimating]  = useState(false);
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const { toast }     = useToast();
  const { startGeneration, running } = useAgentStream(projectId, {
    onError: (msg) => toast(msg, "error"),
  });

  // Debounced cost estimate
  const fetchEstimate = useCallback(async (p: string, prof: string) => {
    if (p.trim().length < 10) { setEstimate(null); return; }
    setEstimating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, routingProfile: prof }),
      });
      if (res.ok) setEstimate(await res.json());
    } catch { /* non-blocking */ }
    finally { setEstimating(false); }
  }, [projectId]);

  useEffect(() => {
    if (estimateTimer.current) clearTimeout(estimateTimer.current);
    estimateTimer.current = setTimeout(() => fetchEstimate(prompt, profile), 600);
    return () => { if (estimateTimer.current) clearTimeout(estimateTimer.current); };
  }, [prompt, profile, fetchEstimate]);

  async function handleGenerate() {
    if (!prompt.trim() || running) return;
    onGenerating(true);
    if (partialMode) {
      // Partial regen — call the partial regen endpoint instead
      try {
        const res = await fetch(`/api/projects/${projectId}/partial-regen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim(), routingProfile: profile }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          toast(d.error ?? "Partial regen failed", "error");
        }
      } catch (err) {
        toast(String(err), "error");
      }
    } else {
      await startGeneration(prompt.trim(), profile);
    }
    onGenerating(false);
    setPrompt("");
    setEstimate(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  }

  const activeProfile = PROFILES.find(p => p.id === profile)!;
  const remaining     = MAX - prompt.length;
  const charWarn      = remaining < 200;

  return (
    <div className="border-b border-white/[0.05] p-3 bg-[#0b0b14]">
      <div className="flex gap-2.5 items-end">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value.slice(0, MAX))}
            onKeyDown={handleKeyDown}
            placeholder={partialMode
              ? "Describe what to change… (only affected agents will re-run)"
              : "Describe your app… (⌘↵ to generate)"
            }
            rows={2}
            disabled={running}
            className={`input-base resize-none text-sm leading-relaxed pr-16 ${partialMode ? "border-orange-500/30 focus:ring-orange-500/30" : ""}`}
            style={{ minHeight: "64px", maxHeight: "128px" }}
          />
          {prompt.length > 0 && (
            <span className={`absolute bottom-2.5 right-3 text-[10px] font-mono transition-colors ${charWarn ? "text-orange-400/80" : "text-white/15"}`}>
              {prompt.length}/{MAX}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 shrink-0">
          {/* Profile picker */}
          <div className="relative">
            <button
              onClick={() => setShowProf(!showProf)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeProfile.dot}`} />
              <span className={`font-medium ${activeProfile.color}`}>{activeProfile.label}</span>
              <ChevronDown className={`w-3 h-3 text-white/25 transition-transform ${showProf ? "rotate-180" : ""}`} />
            </button>

            {showProf && (
              <div className="absolute top-full mt-1.5 right-0 w-52 bg-[#14141f] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden animate-scale-in">
                <div className="p-1">
                  {PROFILES.map(p => (
                    <button key={p.id} onClick={() => { setProfile(p.id); setShowProf(false); }}
                      className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors flex items-center justify-between gap-2 ${
                        profile === p.id ? "bg-white/[0.05]" : "hover:bg-white/[0.04]"
                      }`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.dot}`} />
                        <div>
                          <div className={`font-semibold ${p.color}`}>{p.label}</div>
                          <div className="text-white/30 text-[11px] mt-0.5">{p.desc}</div>
                        </div>
                      </div>
                      {profile === p.id && <Check className="w-3 h-3 text-violet-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={running || !prompt.trim()}
            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs disabled:opacity-35 disabled:cursor-not-allowed transition-all font-semibold shadow-sm h-[30px] ${
              partialMode
                ? "bg-orange-600 hover:bg-orange-500 shadow-orange-500/20 hover:shadow-orange-500/30"
                : "bg-violet-600 hover:bg-violet-500 shadow-violet-500/20 hover:shadow-violet-500/30"
            }`}>
            {running ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running…
              </>
            ) : (
              <>
                {partialMode ? <RefreshCw className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                {partialMode ? "Regen" : "Generate"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bottom row: partial regen toggle + cost estimate */}
      <div className="flex items-center justify-between mt-2 pl-0.5">
        {/* Partial regen toggle */}
        <button
          onClick={() => setPartialMode(v => !v)}
          className={`flex items-center gap-1.5 text-[10px] transition-colors ${
            partialMode ? "text-orange-400" : "text-white/20 hover:text-white/40"
          }`}>
          <RefreshCw className="w-3 h-3" />
          {partialMode ? "Partial regen ON — only changed files" : "Partial regen"}
        </button>

        {/* Cost estimate */}
        {prompt.length >= 10 && (
          <div className="flex items-center gap-3 text-[10px] text-white/25">
            {estimating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : estimate ? (
              <>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {estimate.time.estimated_label}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {estimate.cost.is_free ? "Free" : `~$${estimate.cost.estimated_usd.toFixed(4)}`}
                </span>
                <span className="text-white/15">{estimate.tokens.total.toLocaleString()} tokens</span>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
