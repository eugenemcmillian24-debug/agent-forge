"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Zap, LayoutDashboard, MessageSquare, Users,
  FileText, ShoppingBag, User, Sparkles, Check, Loader2,
} from "lucide-react";
import Link from "next/link";

const TEMPLATES = [
  { id: "saas-dashboard",    label: "SaaS Dashboard",    desc: "Multi-tenant with auth, billing, analytics",  icon: LayoutDashboard, color: "violet"  },
  { id: "ai-chat",           label: "AI Chat App",        desc: "Streaming AI with conversation history",      icon: MessageSquare,   color: "indigo"  },
  { id: "crm",               label: "CRM",                desc: "Pipeline, contacts, and deals",               icon: Users,           color: "emerald" },
  { id: "content-generator", label: "Content Generator", desc: "AI-powered creation with templates",          icon: FileText,        color: "cyan"    },
  { id: "marketplace",       label: "Marketplace",        desc: "Listings, payments, and reviews",             icon: ShoppingBag,     color: "orange"  },
  { id: "portfolio",         label: "Portfolio",          desc: "Projects, blog, and contact",                 icon: User,            color: "pink"    },
  { id: "custom",            label: "Custom",             desc: "Start from scratch with your description",    icon: Sparkles,        color: "white"   },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; ring: string }> = {
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  icon: "text-violet-400",  ring: "ring-violet-500/40"  },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  icon: "text-indigo-400",  ring: "ring-indigo-500/40"  },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400", ring: "ring-emerald-500/40" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    icon: "text-cyan-400",    ring: "ring-cyan-500/40"    },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/20",  icon: "text-orange-400",  ring: "ring-orange-500/40"  },
  pink:    { bg: "bg-pink-500/10",    border: "border-pink-500/20",    icon: "text-pink-400",    ring: "ring-pink-500/40"    },
  white:   { bg: "bg-white/5",        border: "border-white/10",       icon: "text-white/50",    ring: "ring-white/20"       },
};

const DESC_MAX = 300;

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [description, setDesc]  = useState("");
  const [template, setTemplate] = useState("custom");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          template,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create project");
      }
      const { id } = await res.json();
      router.push(`/projects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top bar */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/60">New project</span>
      </div>

      <form onSubmit={handleCreate} className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-violet-400" />
            <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
          </div>
          <p className="text-sm text-white/40">
            Describe your app and pick a starting template. Agents handle the rest.
          </p>
        </div>

        {/* Two-column on lg+ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — details */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Project name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My awesome app"
                maxLength={80}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm
                           placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40
                           focus:border-violet-500/40 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-white/70">Description</label>
                <span className={`text-xs ${description.length > DESC_MAX * 0.9 ? "text-orange-400" : "text-white/30"}`}>
                  {description.length}/{DESC_MAX}
                </span>
              </div>
              <textarea
                value={description}
                onChange={e => setDesc(e.target.value.slice(0, DESC_MAX))}
                placeholder="A SaaS dashboard with multi-tenant auth, Stripe billing, and usage analytics..."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm
                           placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40
                           focus:border-violet-500/40 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Right — templates */}
          <div>
            <p className="text-sm font-medium text-white/70 mb-3">Starting template</p>
            <div className="grid grid-cols-1 gap-2">
              {TEMPLATES.map(({ id, label, desc, icon: Icon, color }) => {
                const c = COLOR_MAP[color];
                const selected = template === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTemplate(id)}
                    className={`flex items-center gap-3 w-full text-left rounded-lg border px-3.5 py-3
                                transition-all ${selected
                                  ? `${c.bg} ${c.border} ring-1 ${c.ring}`
                                  : "bg-white/[0.03] border-white/[0.08] hover:bg-white/5 hover:border-white/15"
                                }`}
                  >
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${c.bg} ${c.border} border`}>
                      <Icon className={`w-4 h-4 ${c.icon}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white/90 leading-tight">{label}</div>
                      <div className="text-xs text-white/40 truncate">{desc}</div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-white/50 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-[#0a0a0f]/80 backdrop-blur border-t border-white/5 -mx-6 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-white/30">
            Agents will generate your full codebase after creation.
          </p>
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                       disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5
                       rounded-lg transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Create project
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
