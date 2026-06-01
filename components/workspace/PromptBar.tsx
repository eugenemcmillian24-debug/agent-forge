"use client";
import { useState, useRef } from "react";
import { Zap, ChevronDown, Check } from "lucide-react";
import { useAgentStream } from "@/hooks/useAgentStream";

const PROFILES = [
  { id: "free_tier",  label: "Free Tier",  desc: "GitHub Models first",  color: "text-emerald-400", dot: "bg-emerald-400" },
  { id: "balanced",   label: "Balanced",   desc: "OpenRouter + GitHub",  color: "text-violet-400",  dot: "bg-violet-400"  },
  { id: "fast_build", label: "Fast Build", desc: "Groq first",           color: "text-orange-400",  dot: "bg-orange-400"  },
  { id: "quality",    label: "Quality",    desc: "Mistral first",        color: "text-blue-400",    dot: "bg-blue-400"    },
];

const MAX = 5000;

export function PromptBar({ projectId, onGenerating }: { projectId: string; onGenerating: (v: boolean) => void }) {
  const [prompt,   setPrompt]   = useState("");
  const [profile,  setProfile]  = useState("balanced");
  const [showProf, setShowProf] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { startGeneration, running } = useAgentStream(projectId);

  async function handleGenerate() {
    if (!prompt.trim() || running) return;
    onGenerating(true);
    await startGeneration(prompt.trim(), profile);
    onGenerating(false);
    setPrompt("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  }

  const activeProfile = PROFILES.find(p => p.id === profile)!;
  const remaining = MAX - prompt.length;
  const charWarn  = remaining < 200;

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
            placeholder="Describe your app… (⌘↵ to generate)"
            rows={2}
            disabled={running}
            className="input-base resize-none text-sm leading-relaxed pr-16"
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
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-35 disabled:cursor-not-allowed transition-all font-semibold shadow-sm shadow-violet-500/20 hover:shadow-violet-500/30 h-[30px]">
            {running ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hint */}
      {!running && prompt.length === 0 && (
        <p className="text-[10px] text-white/15 mt-2 pl-0.5">
          Tip: Be specific — include stack, features, and any constraints
        </p>
      )}
    </div>
  );
}
