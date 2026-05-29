"use client";
import { useState } from "react";
import { Zap, ChevronDown } from "lucide-react";
import { useAgentStream } from "@/hooks/useAgentStream";

const PROFILES = [
  { id: "free_tier",  label: "Free Tier",  desc: "GitHub Models first" },
  { id: "balanced",   label: "Balanced",   desc: "OpenRouter + GitHub" },
  { id: "fast_build", label: "Fast Build", desc: "Groq first" },
  { id: "quality",    label: "Quality",    desc: "Mistral first" },
];

export function PromptBar({ projectId, onGenerating }: { projectId: string; onGenerating: (v: boolean) => void }) {
  const [prompt, setPrompt]   = useState("");
  const [profile, setProfile] = useState("balanced");
  const [showProf, setShowProf] = useState(false);
  const { startGeneration, running } = useAgentStream(projectId);

  async function handleGenerate() {
    if (!prompt.trim() || running) return;
    onGenerating(true);
    await startGeneration(prompt.trim(), profile);
    onGenerating(false);
    setPrompt("");
  }

  return (
    <div className="border-b border-white/5 p-3 flex items-center gap-2">
      <input
        value={prompt} onChange={e => setPrompt(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
        placeholder="Describe your app… (e.g. 'Build a SaaS dashboard with auth, billing, and team management')"
        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
        disabled={running}
      />
      {/* Profile picker */}
      <div className="relative">
        <button onClick={() => setShowProf(!showProf)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white/60">
          {PROFILES.find(p => p.id === profile)?.label} <ChevronDown className="w-3 h-3" />
        </button>
        {showProf && (
          <div className="absolute top-full mt-1 right-0 w-44 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
            {PROFILES.map(p => (
              <button key={p.id} onClick={() => { setProfile(p.id); setShowProf(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs hover:bg-white/5 transition-colors ${profile === p.id ? "text-violet-400" : "text-white/60"}`}>
                <div className="font-medium">{p.label}</div>
                <div className="text-white/30">{p.desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={handleGenerate} disabled={running || !prompt.trim()}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors font-medium">
        {running ? <><span className="animate-spin">⚙</span> Running…</> : <><Zap className="w-3.5 h-3.5" /> Generate</>}
      </button>
    </div>
  );
}
