"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap, LayoutDashboard, MessageSquare, Users, FileText, ShoppingBag, User, Sparkles, Check } from "lucide-react";
import Link from "next/link";

const TEMPLATES = [
  { id: "saas-dashboard",    label: "SaaS Dashboard",    desc: "Multi-tenant with auth, billing, analytics", icon: LayoutDashboard, color: "violet" },
  { id: "ai-chat",           label: "AI Chat App",        desc: "Streaming AI with conversation history",     icon: MessageSquare,   color: "indigo" },
  { id: "crm",               label: "CRM",                desc: "Pipeline, contacts, and deals",              icon: Users,           color: "emerald" },
  { id: "content-generator", label: "Content Generator",  desc: "AI-powered creation with templates",         icon: FileText,        color: "cyan" },
  { id: "marketplace",       label: "Marketplace",        desc: "Listings, payments, and reviews",            icon: ShoppingBag,     color: "orange" },
  { id: "portfolio",         label: "Portfolio",           desc: "Projects, blog, and contact",                icon: User,            color: "pink" },
  { id: "custom",            label: "Custom",              desc: "Start from scratch with your description",   icon: Sparkles,        color: "white" },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string }> = {
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  icon: "text-violet-400" },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  icon: "text-indigo-400" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    icon: "text-cyan-400" },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/20",  icon: "text-orange-400" },
  pink:    { bg: "bg-pink-500/10",    border: "border-pink-500/20",    icon: "text-pink-400" },
  white:   { bg: "bg-white/5",        border: "border-white/10",       icon: "text-white/50" },
};

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [description, setDesc]  = useState("");
  const [template, setTemplate] = useState("custom");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, template }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to create project"); }
      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch (err) { setError(String(err)); setLoading(false); }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/35 hover:text-white/70 text-sm mb-8 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to projects
      </Link>

      <h1 className="text-[22px] font-bold tracking-tight mb-1">New project</h1>
      <p className="text-white/35 text-sm mb-8">Pick a template or start from scratch</p>

      <form onSubmit={handleCreate} className="space-y-7">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
            <span className="mt-0.5">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm text-white/55 font-medium">
              Project name <span className="text-red-400/70">*</span>
            </label>
            <span className="text-xs text-white/20">{name.length}/100</span>
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required maxLength={100}
            className="input-base" placeholder="My awesome app" />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm text-white/55 font-medium">
            Description <span className="text-white/20 font-normal">(optional)</span>
          </label>
          <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
            className="input-base resize-none"
            placeholder="What does your app do? The more detail, the better the output." />
        </div>

        {/* Templates */}
        <div className="space-y-2.5">
          <label className="text-sm text-white/55 font-medium">Template</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map(t => {
              const c = COLOR_MAP[t.color] ?? COLOR_MAP.white;
              const Icon = t.icon;
              const selected = template === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                  className={`relative text-left p-3.5 rounded-xl border transition-all ${
                    selected
                      ? "border-violet-500/40 bg-violet-500/10 shadow-sm shadow-violet-500/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                  }`}>
                  {selected && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div className={`w-7 h-7 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center mb-2.5`}>
                    <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
                  </div>
                  <div className="font-medium text-sm mb-0.5">{t.label}</div>
                  <div className="text-xs text-white/35 leading-snug">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading || !name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all py-3 rounded-xl font-semibold text-sm shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 group">
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating project…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Create project
            </>
          )}
        </button>
      </form>
    </div>
  );
}
