import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AgentForge — Build Full-Stack Apps with AI Agents",
  description: "Describe your app in plain English. AgentForge orchestrates 12 specialized agents to generate the codebase, preview it live, and deploy to Cloudflare — free tier available.",
  openGraph: {
    title: "AgentForge — Build Full-Stack Apps with AI Agents",
    description: "Describe your app. 12 agents generate the full codebase, ready to deploy. Free tier with GitHub Models.",
    type: "website",
  },
};

import Link from "next/link";
import {
  ArrowRight, Zap, GitBranch, Cloud, Package, MessageSquare,
  Code2, Eye, Bot, Layers, Shield, Sparkles, CheckCircle,
  Terminal, Cpu, Database, Workflow
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">AgentForge</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            {["Features","Agents","Providers","Stack"].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="hover:text-white transition-colors duration-150">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
              Sign in
            </Link>
            <Link href="/signup" className="text-sm bg-violet-600 hover:bg-violet-500 transition-all px-4 py-2 rounded-lg font-medium shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-36 pb-28 px-6 relative overflow-hidden">
        {/* Orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none">
          <div className="absolute inset-0 bg-violet-600/8 rounded-full blur-[120px] animate-float" />
          <div className="absolute top-10 left-20 w-64 h-64 bg-indigo-600/6 rounded-full blur-[80px]" style={{animationDelay:"2s"}} />
          <div className="absolute top-5 right-20 w-48 h-48 bg-cyan-500/5 rounded-full blur-[60px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8 animate-fade-up">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-agent AI app builder — describe, generate, deploy</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-[72px] font-bold tracking-tight leading-[1.08] mb-6 animate-fade-up" style={{animationDelay:"0.05s"}}>
            Build full-stack apps
            <br />
            <span className="gradient-text-shimmer">with AI agents</span>
          </h1>

          <p className="text-xl text-white/45 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up" style={{animationDelay:"0.1s"}}>
            Describe your app in plain English. AgentForge orchestrates 12 specialized agents to generate the codebase, preview it live, and deploy to Cloudflare — in one workflow.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 animate-fade-up" style={{animationDelay:"0.15s"}}>
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 transition-all px-8 py-3.5 rounded-xl font-semibold text-[15px] group shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35">
              Start building free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="https://github.com/eugenemcmillian24-debug/agent-forge" className="inline-flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] transition-all px-8 py-3.5 rounded-xl font-semibold text-[15px]">
              <GitBranch className="w-4 h-4" />
              View on GitHub
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-white/30 animate-fade-up" style={{animationDelay:"0.2s"}}>
            {["Free tier with GitHub Models","No credit card required","Deploy to Cloudflare in seconds"].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500/60" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Workflow steps ── */}
      <section className="py-14 border-y border-white/[0.05] bg-white/[0.015]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { n:"01", label:"Describe your app" },
              { n:"02", label:"Orchestrator plans DAG" },
              { n:"03", label:"Agents generate code" },
              { n:"04", label:"QA validates output" },
              { n:"05", label:"Preview live" },
              { n:"06", label:"Deploy to Cloudflare" },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex flex-col items-center text-center gap-2 relative">
                {i < 5 && (
                  <div className="hidden md:block absolute top-3.5 left-[60%] w-full h-px bg-gradient-to-r from-violet-500/20 to-transparent" />
                )}
                <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-400 relative z-10">
                  {n}
                </div>
                <p className="text-xs text-white/40 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Everything you need to ship</h2>
            <p className="text-white/45 text-lg max-w-xl mx-auto">From prompt to production. No context switching, no manual wiring.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: "Chat to build",         desc: "Describe your app, then refine through conversation. Partial regen preserves your edits.",       color: "violet",  glow: "rgba(139,92,246,0.15)" },
              { icon: Code2,         title: "Live code editor",      desc: "Browse the file tree, edit any generated file, and see changes reflected immediately.",           color: "indigo",  glow: "rgba(99,102,241,0.15)" },
              { icon: Eye,           title: "Instant preview",       desc: "Every generation produces a live preview. No local setup required.",                              color: "cyan",    glow: "rgba(6,182,212,0.12)" },
              { icon: GitBranch,     title: "GitHub push",           desc: "One click to create a repo, commit all files, and push with a meaningful commit message.",        color: "emerald", glow: "rgba(52,211,153,0.12)" },
              { icon: Cloud,         title: "Cloudflare deploy",     desc: "Auto-detect Pages vs Workers. Generate wrangler config and CI/CD workflow automatically.",        color: "blue",    glow: "rgba(59,130,246,0.12)" },
              { icon: Package,       title: "ZIP export",            desc: "Download your project as a clean ZIP with manifest, setup docs, and .env.example included.",      color: "orange",  glow: "rgba(249,115,22,0.12)" },
              { icon: Layers,        title: "Version history",       desc: "Every generation creates a snapshot. Roll back to any version with one click.",                   color: "pink",    glow: "rgba(236,72,153,0.12)" },
              { icon: Zap,           title: "Multi-provider routing",desc: "GitHub Models, Groq, Mistral, OpenRouter, HuggingFace — auto-fallback across providers.",         color: "yellow",  glow: "rgba(234,179,8,0.12)" },
              { icon: Shield,        title: "Secrets never leak",    desc: "Provider keys stay server-side. RLS enforces per-user data isolation at the DB layer.",           color: "red",     glow: "rgba(239,68,68,0.12)" },
            ].map(({ icon: Icon, title, desc, color, glow }) => (
              <div key={title} className="group relative p-6 rounded-2xl border border-white/[0.06] bg-white/[0.025] glass-hover overflow-hidden">
                {/* Glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" style={{background: `radial-gradient(circle at 30% 30%, ${glow}, transparent 70%)`}} />
                <div className={`relative w-10 h-10 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                <h3 className="relative font-semibold mb-2 text-[15px]">{title}</h3>
                <p className="relative text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agents ── */}
      <section id="agents" className="py-28 px-6 bg-white/[0.015] border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">12 specialized agents</h2>
            <p className="text-white/45 text-lg max-w-xl mx-auto">Each agent has a strict JSON contract, bounded retries, and provenance metadata on every file it generates.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { name: "Orchestrator",    role: "DAG planning + task routing",  primary: true,  icon: Workflow },
              { name: "Product Manager", role: "Feature brief + milestones",   primary: false, icon: MessageSquare },
              { name: "Architect",       role: "System design + API plan",     primary: false, icon: Layers },
              { name: "UI/UX",           role: "Design system + screens",      primary: false, icon: Eye },
              { name: "Frontend",        role: "Pages, components, hooks",     primary: false, icon: Code2 },
              { name: "Backend",         role: "Routes, auth, server actions", primary: false, icon: Terminal },
              { name: "Database",        role: "Schema, migrations, RLS",      primary: false, icon: Database },
              { name: "AI Integration",  role: "Provider abstraction",         primary: false, icon: Cpu },
              { name: "GitHub",          role: "Repo creation + push",         primary: false, icon: GitBranch },
              { name: "Cloudflare",      role: "Deploy config + CI/CD",        primary: false, icon: Cloud },
              { name: "QA",              role: "Lint, typecheck, validate",    primary: false, icon: CheckCircle },
              { name: "Repair",          role: "Fix errors, preserve edits",   primary: false, icon: Zap },
            ].map(({ name, role, primary, icon: Icon }) => (
              <div key={name} className={`group p-4 rounded-xl border transition-all ${
                primary
                  ? "border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/15"
                  : "border-white/[0.06] bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.05]"
              }`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2.5 ${primary ? "bg-violet-500/20" : "bg-white/5"}`}>
                  <Icon className={`w-3.5 h-3.5 ${primary ? "text-violet-400" : "text-white/40"}`} />
                </div>
                <div className={`font-medium text-sm mb-0.5 ${primary ? "text-violet-200" : ""}`}>{name}</div>
                <div className="text-xs text-white/35 leading-snug">{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Providers ── */}
      <section id="providers" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">5 providers, smart routing</h2>
            <p className="text-white/45 text-lg max-w-xl mx-auto">Each agent picks the best model for its task. Falls back automatically. Every call is logged with provider, model, tokens, and latency.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
            {[
              { name: "GitHub Models", badge: "Free tier",       desc: "gpt-4.1-mini · deepseek-v3 · phi-4",      highlight: true  },
              { name: "Mistral",       badge: "Code specialist", desc: "codestral-latest · mistral-large",          highlight: false },
              { name: "Groq",          badge: "Fast repair",     desc: "llama-3.3-70b · qwen3-32b",                highlight: false },
              { name: "OpenRouter",    badge: "Dynamic",         desc: "Free + paid · long context overflow",       highlight: false },
              { name: "HuggingFace",   badge: "Fallback",        desc: "Inference Providers · open models",         highlight: false },
            ].map(({ name, badge, desc, highlight }) => (
              <div key={name} className={`p-5 rounded-2xl border transition-all ${
                highlight ? "border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/8" : "border-white/[0.06] bg-white/[0.025] hover:border-white/10"
              }`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-semibold text-sm">{name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${highlight ? "bg-emerald-500/15 text-emerald-300" : "bg-white/8 text-white/40"}`}>{badge}</span>
                </div>
                <p className="text-xs text-white/35 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          {/* Routing modes */}
          <div className="p-5 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
            <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-4">Routing profiles</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-sm">
              {[
                { mode: "Free Tier",  order: "GitHub Models → OpenRouter → Groq → HuggingFace" },
                { mode: "Balanced",   order: "OpenRouter → GitHub Models → Groq → Mistral" },
                { mode: "Fast Build", order: "Groq → GitHub Models → OpenRouter → Mistral" },
                { mode: "Quality",    order: "Mistral → GitHub Models → OpenRouter → Groq" },
              ].map(({ mode, order }) => (
                <div key={mode}>
                  <div className="text-white/65 font-medium mb-1 text-[13px]">{mode}</div>
                  <div className="text-xs text-white/25 leading-relaxed">{order}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stack ── */}
      <section id="stack" className="py-28 px-6 bg-white/[0.015] border-y border-white/[0.05]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">Production-grade stack</h2>
          <p className="text-white/45 text-lg mb-12">Strict TypeScript, Zod validation, Supabase RLS, and real CI/CD. No toy demos.</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {["Next.js 16","TypeScript","Tailwind CSS v4","Supabase","Supabase Auth","Supabase RLS","Zod","Zustand","React Hook Form","Cloudflare Workers","OpenNext","GitHub Actions","Octokit","JSZip","@supabase/ssr"].map(tech => (
              <span key={tech} className="px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.03] text-sm text-white/55 hover:text-white/80 hover:border-white/15 transition-all cursor-default">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-violet-600/6 rounded-full blur-[100px] pointer-events-none" />
          <h2 className="relative text-4xl md:text-5xl font-bold mb-5 tracking-tight">Ready to build?</h2>
          <p className="relative text-white/45 text-lg mb-10">Start free with GitHub Models. Add Mistral and Groq for faster, higher-quality generation.</p>
          <Link href="/signup" className="relative inline-flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 transition-all px-10 py-4 rounded-xl font-semibold text-lg group shadow-xl shadow-violet-500/25 hover:shadow-violet-500/35">
            Create your first app
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <p className="relative mt-5 text-sm text-white/25">Free forever · GitHub Models · No credit card required</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/25">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-indigo-600" />
            <span className="font-medium text-white/40">AgentForge</span>
          </div>
          <div className="flex gap-6">
            {["Docs","GitHub","Privacy"].map(l => (
              <a key={l} href="#" className="hover:text-white/50 transition-colors">{l}</a>
            ))}
          </div>
          <span>MIT License · Built with AgentForge</span>
        </div>
      </footer>
    </div>
  );
}
