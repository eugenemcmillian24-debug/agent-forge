"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Zap, LayoutDashboard, MessageSquare, Users,
  FileText, ShoppingBag, User, Sparkles, Check, Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const TEMPLATES = [
  {
    id: "saas-dashboard",
    label: "SaaS Dashboard",
    desc: "Multi-tenant with auth, billing, analytics, and usage tracking.",
    icon: LayoutDashboard,
    color: "violet",
    tags: ["Auth", "Billing", "Analytics"],
    example: "Like Linear or Vercel's dashboard",
  },
  {
    id: "ai-chat",
    label: "AI Chat App",
    desc: "Streaming AI with conversation history, multi-model routing, and context memory.",
    icon: MessageSquare,
    color: "indigo",
    tags: ["Streaming", "Multi-model", "History"],
    example: "Like ChatGPT or Claude",
  },
  {
    id: "crm",
    label: "CRM",
    desc: "Pipeline management, contact tracking, deals, and activity timeline.",
    icon: Users,
    color: "emerald",
    tags: ["Pipeline", "Contacts", "Deals"],
    example: "Like HubSpot or Pipedrive",
  },
  {
    id: "content-generator",
    label: "Content Generator",
    desc: "AI-powered creation with templates, brand voice, and export to multiple formats.",
    icon: FileText,
    color: "cyan",
    tags: ["AI Writing", "Templates", "Export"],
    example: "Like Copy.ai or Jasper",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    desc: "Listings, payments via Stripe, reviews, seller dashboard, and search.",
    icon: ShoppingBag,
    color: "orange",
    tags: ["Payments", "Listings", "Reviews"],
    example: "Like Gumroad or a niche Etsy",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    desc: "Projects showcase, blog with MDX, contact form, and dark mode.",
    icon: User,
    color: "pink",
    tags: ["Blog", "Projects", "Contact"],
    example: "Developer or designer portfolio",
  },
  {
    id: "custom",
    label: "Custom",
    desc: "Start from scratch. Describe exactly what you want in the prompt.",
    icon: Sparkles,
    color: "white",
    tags: ["Flexible", "Any stack", "Your idea"],
    example: "Anything you can describe",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; ring: string; tag: string }> = {
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  icon: "text-violet-400",  ring: "ring-violet-500/40",  tag: "bg-violet-500/10 text-violet-300 border-violet-500/20"  },
  indigo:  { bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  icon: "text-indigo-400",  ring: "ring-indigo-500/40",  tag: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"  },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400", ring: "ring-emerald-500/40", tag: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    icon: "text-cyan-400",    ring: "ring-cyan-500/40",    tag: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"    },
  orange:  { bg: "bg-orange-500/10",  border: "border-orange-500/20",  icon: "text-orange-400",  ring: "ring-orange-500/40",  tag: "bg-orange-500/10 text-orange-300 border-orange-500/20"  },
  pink:    { bg: "bg-pink-500/10",    border: "border-pink-500/20",    icon: "text-pink-400",    ring: "ring-pink-500/40",    tag: "bg-pink-500/10 text-pink-300 border-pink-500/20"    },
  white:   { bg: "bg-white/5",        border: "border-white/10",       icon: "text-white/50",    ring: "ring-white/20",       tag: "bg-white/5 text-white/40 border-white/10"       },
};

const DESC_MAX = 500;

export default function NewProjectPage() {
  const router = useRouter();
  const [name,        setName]        = useState("");
  const [description, setDesc]        = useState("");
  const [template,    setTemplate]    = useState("custom");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [step,        setStep]        = useState<"template" | "details">("template");

  const selected = TEMPLATES.find(t => t.id === template)!;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, template }),
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
        {step === "details" ? (
          <button onClick={() => setStep("template")}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to templates
          </button>
        ) : (
          <Link href="/dashboard"
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
        )}
        <span className="text-white/20">/</span>
        <span className="text-sm text-white/60">
          {step === "template" ? "Choose a template" : `New ${selected.label} project`}
        </span>
      </div>

      {/* ── Step 1: Template Gallery ── */}
      {step === "template" && (
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-violet-400" />
              <h1 className="text-2xl font-semibold tracking-tight">Start with a template</h1>
            </div>
            <p className="text-sm text-white/40">
              Pick a starting point. Agents will generate a complete codebase tailored to your description.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(({ id, label, desc, icon: Icon, color, tags, example }) => {
              const c = COLOR_MAP[color];
              const isSelected = template === id;
              return (
                <button
                  key={id}
                  onClick={() => { setTemplate(id); setStep("details"); }}
                  className={`group relative flex flex-col text-left rounded-2xl border p-5 transition-all hover:scale-[1.02] active:scale-[0.99] ${
                    isSelected
                      ? `${c.bg} ${c.border} ring-1 ${c.ring}`
                      : "bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.14]"
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${c.bg} border ${c.border}`}>
                    <Icon className={`w-5 h-5 ${c.icon}`} />
                  </div>

                  {/* Title + desc */}
                  <h3 className="text-sm font-semibold text-white/90 mb-1.5">{label}</h3>
                  <p className="text-xs text-white/40 leading-relaxed mb-4 flex-1">{desc}</p>

                  {/* Example */}
                  <p className="text-[11px] text-white/20 italic mb-3">{example}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${c.tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Select indicator */}
                  <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? `${c.border} ${c.bg}` : "border-white/10"
                  }`}>
                    {isSelected && <Check className={`w-3 h-3 ${c.icon}`} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 2: Project Details ── */}
      {step === "details" && (
        <form onSubmit={handleCreate} className="max-w-xl mx-auto px-6 py-10">
          {/* Selected template badge */}
          {(() => {
            const c = COLOR_MAP[selected.color];
            const Icon = selected.icon;
            return (
              <div className={`flex items-center gap-3 p-4 rounded-xl border mb-8 ${c.bg} ${c.border}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg} border ${c.border}`}>
                  <Icon className={`w-4.5 h-4.5 ${c.icon}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{selected.label}</p>
                  <p className="text-xs text-white/40">{selected.example}</p>
                </div>
                <button type="button" onClick={() => setStep("template")}
                  className="ml-auto text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">
                  Change
                </button>
              </div>
            );
          })()}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">
                Project name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`My ${selected.label}`}
                maxLength={80}
                required
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-white/70">
                  Describe your app
                  <span className="ml-1 text-white/30 font-normal">(the more detail, the better the output)</span>
                </label>
                <span className={`text-xs ${description.length > DESC_MAX * 0.9 ? "text-orange-400" : "text-white/25"}`}>
                  {description.length}/{DESC_MAX}
                </span>
              </div>
              <textarea
                value={description}
                onChange={e => setDesc(e.target.value.slice(0, DESC_MAX))}
                placeholder={
                  selected.id === "saas-dashboard"
                    ? "A SaaS dashboard for a project management tool. Multi-tenant with Stripe billing, usage analytics, team invites, and a Kanban board..."
                    : selected.id === "ai-chat"
                    ? "A customer support AI chat with GPT-4, conversation history, escalation to human agents, and a dashboard for reviewing conversations..."
                    : "Describe your app — features, target users, key workflows, any specific integrations..."
                }
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all py-3 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating project…
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
      )}
    </div>
  );
}
