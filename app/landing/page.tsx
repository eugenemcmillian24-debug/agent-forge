import Link from "next/link";
import {
  ArrowRight, Zap, GitBranch, Cloud, Package, MessageSquare,
  Code2, Eye, Bot, Layers, Shield, Sparkles, CheckCircle,
  Terminal, Cpu, Database, Workflow, ChevronRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* ── Nav ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-6 border-b border-white/[0.05] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 mr-8">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight">AgentForge</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {["Features", "Agents", "Providers", "Stack"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              className="px-3 py-1.5 text-sm text-white/45 hover:text-white/80 rounded-lg hover:bg-white/[0.04] transition-all">
              {l}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <Link href="/login"
            className="px-3.5 py-1.5 text-sm text-white/50 hover:text-white/80 rounded-lg hover:bg-white/[0.04] transition-all">
            Sign in
          </Link>
          <Link href="/signup"
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 rounded-lg font-medium shadow-sm shadow-violet-500/25 transition-all">
            Get started <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none">
          <div className="absolute top-16 left-1/2 -translate-x-[60%] w-[500px] h-[500px] bg-violet-600/12 rounded-full blur-[120px] animate-glow-pulse" />
          <div className="absolute top-24 left-1/2 -translate-x-[30%] w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px]" />
          <div className="absolute top-32 left-1/2 translate-x-[10%] w-[280px] h-[280px] bg-cyan-500/8 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto animate-fade-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/8 text-sm text-violet-300 mb-8 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Multi-agent AI app builder — describe, generate, deploy
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
            Build full-stack apps
            <br />
            <span className="gradient-text-shimmer">with AI agents</span>
          </h1>

          <p className="text-lg text-white/45 leading-relaxed mb-10 max-w-xl mx-auto">
            Describe your app in plain English. AgentForge orchestrates 12 specialized agents to generate the codebase, preview it live, and deploy to Cloudflare — in one workflow.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/signup"
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-[15px] shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 transition-all group">
              Start building free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="https://github.com/eugenemcmillian24-debug/agent-forge" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.15] font-medium text-[15px] text-white/70 hover:text-white transition-all">
              <GitBranch className="w-4 h-4" />
              View on GitHub
            </a>
          </div>

          {/* Social proof pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              "Free tier with GitHub Models",
              "No credit card required",
              "Deploy to Cloudflare in seconds",
            ].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-sm text-white/35">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow steps ── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-0">
            {[
              { n: "01", label: "Describe your app", icon: MessageSquare, color: "violet" },
              { n: "02", label: "Orchestrator plans DAG", icon: Workflow, color: "indigo" },
              { n: "03", label: "Agents generate code", icon: Cpu, color: "blue" },
              { n: "04", label: "QA validates output", icon: Shield, color: "cyan" },
              { n: "05", label: "Preview live", icon: Eye, color: "teal" },
              { n: "06", label: "Deploy to Cloudflare", icon: Cloud, color: "emerald" },
            ].map(({ n, label, icon: Icon, color }, i) => (
              <div key={n} className="flex items-center">
                <div className="flex flex-col items-center gap-2 px-4 py-3 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all
                    bg-${color}-500/10 border-${color}-500/20 group-hover:bg-${color}-500/15 group-hover:border-${color}-500/30`}>
                    <Icon className={`w-4.5 h-4.5 text-${color}-400`} />
                  </div>
                  <span className="text-[10px] font-bold text-white/20">{n}</span>
                  <span className="text-xs text-white/50 text-center leading-tight max-w-[80px]">{label}</span>
                </div>
                {i < 5 && (
                  <ChevronRight className="w-3.5 h-3.5 text-white/15 shrink-0 -mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Everything you need to ship
            </h2>
            <p className="text-white/40 text-base max-w-md mx-auto">
              From prompt to production. No context switching, no manual wiring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: "Chat to build",     desc: "Describe your app, then refine through conversation. Partial regen preserves your edits.",           color: "violet",  glow: "rgba(139,92,246,0.12)" },
              { icon: Code2,         title: "Live code editor",  desc: "Browse the file tree, edit any generated file, and see changes reflected immediately.",              color: "indigo",  glow: "rgba(99,102,241,0.12)" },
              { icon: Eye,           title: "Instant preview",   desc: "Every generation produces a live preview. No local setup required.",                                 color: "cyan",    glow: "rgba(6,182,212,0.10)" },
              { icon: GitBranch,     title: "GitHub push",       desc: "One click to create a repo, commit all files, and push with a meaningful commit message.",           color: "emerald", glow: "rgba(52,211,153,0.10)" },
              { icon: Cloud,         title: "Cloudflare deploy", desc: "Auto-detect Pages vs Workers. Generate wrangler config and CI/CD workflow automatically.",           color: "blue",    glow: "rgba(59,130,246,0.10)" },
              { icon: Package,       title: "ZIP export",        desc: "Download the full project with manifest, setup docs, and .env.example. Own your code.",             color: "orange",  glow: "rgba(251,146,60,0.10)" },
              { icon: Terminal,      title: "Version history",   desc: "Every generation creates a rollback snapshot. Experiment freely, restore in one click.",            color: "pink",    glow: "rgba(236,72,153,0.10)" },
              { icon: Layers,        title: "Multi-provider",    desc: "5 AI providers — GitHub Models, Mistral, Groq, OpenRouter, HuggingFace. Automatic failover.",        color: "purple",  glow: "rgba(168,85,247,0.10)" },
              { icon: Database,      title: "Supabase native",   desc: "Row-level security, per-user data isolation, and migrations included in every generated app.",       color: "teal",    glow: "rgba(20,184,166,0.10)" },
            ].map(({ icon: Icon, title, desc, color, glow }) => (
              <div key={title}
                className="relative p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all duration-200 group overflow-hidden"
                style={{ "--glow": glow } as React.CSSProperties}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${glow}, transparent 70%)` }} />
                <div className={`relative w-9 h-9 rounded-xl bg-${color}-500/10 border border-${color}-500/15 flex items-center justify-center mb-4 group-hover:bg-${color}-500/15 transition-colors`}>
                  <Icon className={`w-4 h-4 text-${color}-400`} />
                </div>
                <h3 className="relative text-sm font-semibold mb-1.5">{title}</h3>
                <p className="relative text-xs text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agents ── */}
      <section id="agents" className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">12 specialized agents</h2>
            <p className="text-white/40 text-base">Each agent is an expert. Together they build your entire app.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { name: "Orchestrator",    color: "violet",  icon: Workflow },
              { name: "Product Manager", color: "indigo",  icon: Layers },
              { name: "Architect",       color: "blue",    icon: Cpu },
              { name: "UI/UX",           color: "pink",    icon: Sparkles },
              { name: "Frontend",        color: "cyan",    icon: Code2 },
              { name: "Backend",         color: "blue",    icon: Terminal },
              { name: "Database",        color: "emerald", icon: Database },
              { name: "AI Integration",  color: "purple",  icon: Bot },
              { name: "GitHub",          color: "white",   icon: GitBranch },
              { name: "Cloudflare",      color: "orange",  icon: Cloud },
              { name: "QA",              color: "yellow",  icon: Shield },
              { name: "Repair",          color: "red",     icon: Zap },
            ].map(({ name, color, icon: Icon }) => (
              <div key={name}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-${color === "white" ? "white" : color}-500/[0.06] hover:border-${color === "white" ? "white" : color}-500/20 transition-all group`}>
                <div className={`w-7 h-7 rounded-lg bg-${color === "white" ? "white" : color}-500/10 flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 text-${color === "white" ? "white/50" : color + "-400"}`} />
                </div>
                <span className="text-xs font-medium text-white/55 group-hover:text-white/80 transition-colors">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Ready to build with agents?
          </h2>
          <p className="text-white/40 text-base mb-8 max-w-md mx-auto leading-relaxed">
            Free tier available with GitHub Models. No credit card. Deploy your first app in minutes.
          </p>
          <Link href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-[15px] shadow-xl shadow-violet-500/25 hover:shadow-violet-500/35 transition-all group">
            Start building free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-sm font-medium text-white/40">AgentForge</span>
          </div>
          <p className="text-xs text-white/20">© 2026 AgentForge · MIT License · Built with Next.js + Supabase</p>
          <a href="https://github.com/eugenemcmillian24-debug/agent-forge" target="_blank" rel="noopener noreferrer"
            className="text-xs text-white/25 hover:text-white/50 transition-colors flex items-center gap-1.5">
            <GitBranch className="w-3 h-3" /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
