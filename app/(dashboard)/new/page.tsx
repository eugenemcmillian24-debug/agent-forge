"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";

const TEMPLATES = [
  { id: "saas-dashboard",     label: "SaaS Dashboard",     desc: "Multi-tenant dashboard with auth, billing, and analytics" },
  { id: "ai-chat",            label: "AI Chat App",         desc: "Chat interface with streaming AI responses and history" },
  { id: "crm",                label: "CRM",                 desc: "Customer management with pipeline, contacts, and deals" },
  { id: "content-generator",  label: "Content Generator",   desc: "AI-powered content creation with templates and export" },
  { id: "marketplace",        label: "Marketplace",         desc: "Two-sided marketplace with listings, payments, and reviews" },
  { id: "portfolio",          label: "Portfolio",            desc: "Developer portfolio with projects, blog, and contact" },
  { id: "custom",             label: "Custom",               desc: "Start from scratch with your own description" },
];

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
      <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to projects
      </Link>
      <h1 className="text-2xl font-bold mb-1">New project</h1>
      <p className="text-white/40 text-sm mb-8">Pick a template or start from scratch</p>

      <form onSubmit={handleCreate} className="space-y-6">
        {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Project name <span className="text-red-400">*</span></label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required maxLength={100}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 text-sm"
            placeholder="My awesome app" />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Description <span className="text-white/30">(optional)</span></label>
          <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 text-sm resize-none"
            placeholder="What does your app do?" />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">Template</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map(t => (
              <button key={t.id} type="button" onClick={() => setTemplate(t.id)}
                className={`text-left p-3.5 rounded-xl border transition-all ${template === t.id ? "border-violet-500/50 bg-violet-500/10" : "border-white/5 bg-white/[0.03] hover:border-white/10"}`}>
                <div className="font-medium text-sm mb-0.5">{t.label}</div>
                <div className="text-xs text-white/40">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || !name.trim()}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors py-3 rounded-xl font-semibold text-sm">
          {loading ? "Creating…" : <><Zap className="w-4 h-4" /> Create project</>}
        </button>
      </form>
    </div>
  );
}
