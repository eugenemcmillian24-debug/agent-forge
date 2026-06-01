"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Zap, LayoutDashboard, MessageSquare, Users,
  FileText, ShoppingBag, User, Sparkles, Check, AlertTriangle
} from "lucide-react";
import Link from "next/link";

const TEMPLATES = [
  { id: "saas-dashboard",    label: "SaaS Dashboard",    desc: "Multi-tenant with auth, billing, analytics", icon: LayoutDashboard, color: "violet"  },
  { id: "ai-chat",           label: "AI Chat App",        desc: "Streaming AI with conversation history",     icon: MessageSquare,   color: "indigo"  },
  { id: "crm",               label: "CRM",                desc: "Pipeline, contacts, and deals",              icon: Users,           color: "emerald" },
  { id: "content-generator", label: "Content Generator",  desc: "AI-powered creation with templates",         icon: FileText,        color: "cyan"    },
  { id: "marketplace",       label: "Marketplace",        desc: "Listings, payments, and reviews",            icon: ShoppingBag,     color: "orange"  },
  { id: "portfolio",         label: "Portfolio",           desc: "Projects, blog, and contact",                icon: User,            color: "pink"    },
  { id: "custom",            label: "Custom",              desc: "Start from scratch with your description",   icon: Sparkles,        color: "white"   },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; glow: string; activeBorder: string }> = {
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/15",  icon: "text-violet-400",  glow: "rgba(139,92,246,0.12)",  activeBorder: "border-violet-500/40"  },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/15",  icon: "text-indigo-400",  glow: "rgba(99,102,241,0.12)",  activeBorder: "border-indigo-500/40"  },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/15", icon: "text-emerald-400", glow: "rgba(52,211,153,0.10)",  activeBorder: "border-emerald-500/40" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/15",    icon: "text-cyan-400",    glow: "rgba(6,182,212,0.10)",   activeBorder: "border-cyan-500/40"    },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/15",  icon: "text-orange-400",  glow: "rgba(251,146,60,0.10)",  activeBorder: "border-orange-500/40"  },
  pink:    { bg: "bg-pink-500/10",    border: "border-pink-500/15",    icon: "text-pink-400",    glow: "rgba(236,72,153,0.10)",  activeBorder: "border-pink-500/40"    },
  white:   { bg: "bg-white/[0.04]",   border: "border-white/[0.08]",   icon: "text-white/45",    glow: "rgba(255,255,255,0.04)", activeBorder: "border-white/20"       },
};

export default function NewProjectPage() {
  const router = useRouter();
  const [name,        setName]     = useState("");
  const [description, setDesc]     = useState("");
  const [template,    setTemplate] = useState("custom");
  const [loading,     setLoading]  = useState(false);
  const [error,       setError]    = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, template }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create project"); }
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) { setError(String(err)); setLoading(false); }
  }

  // ⌘↵ / Ctrl+↵ submits
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (name.trim() && !loading) handleCreate(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="p-8 max-w-2xl" onKeyDown={handleKeyDown}>
      {/* Back */}
      <Link href="/dashboard"
        className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/65 text-sm mb-8 transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to projects
      </Link>

      <h1 className="text-[22px] font-bold tracking-tight mb-1">New project</h1>
      <p className="text-white/35 text-sm mb-8">Pick a template or start from scratch</p>

      <form onSubmit={handleCreate} className="space-y-7">

        {/* Error */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5 animate-fade-up">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm text-white/55 font-medium">
              Project name <span className="text-red-400/60">*</span>
            </label>
            <span className={`text-xs tabular-nums transition-colors ${name.length > 80 ? "text-orange-400/80" : "text-white/20"}`}>
              {name.length}/100
            </span>
          </div>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            required maxLength={100} autoFocus
            className="input-base" placeholder="My awesome app"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm text-white/55 font-medium">
            Description <span className="text-white/20 font-normal">(optional)</span>
          </label>
          <textarea
            value={description} onChange={e => setDesc(e.target.value)} rows={3}
            className="input-base resize-none"
            placeholder="What does your app do? The more detail, the better the output."
          />
          <p className="text-[11px] text-white/18">Tip: include tech stack, target users, and key features for best results</p>
        </div>

        {/* Templates */}
        <div className="space-y-3">
          <label className="text-sm text-white/55 font-medium">Template</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TEMPLATES.map(t => {
              const c        = COLOR_MAP[t.color] ?? COLOR_MAP.white;
              const Icon     = t.icon;
              const selected = template === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                  className={`relative text-left p-4 rounded-xl border transition-all duration-200 group overflow-hidden ${
                    selected
                      ? `${c.activeBorder} bg-white/[0.04] shadow-sm`
                      : `border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]`
                  }`}>
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
                    style={{ background: `radial-gradient(circle at 20% 50%, ${c.glow}, transparent 70%)` }} />

                  {/* Selected check */}
                  {selected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shadow-sm shadow-violet-500/30">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className={`relative w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${c.icon}`} />
                  </div>
                  <div className="relative font-semibold text-sm mb-1">{t.label}</div>
                  <div className="relative text-xs text-white/35 leading-snug">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading || !name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-45 disabled:cursor-not-allowed transition-all py-3 rounded-xl font-semibold text-sm shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 group">
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating project…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Create project
              <span className="ml-1 text-white/35 text-xs font-normal hidden sm:inline">⌘↵</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
