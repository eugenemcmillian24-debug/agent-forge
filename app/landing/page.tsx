import Link from "next/link";
import { ArrowRight, Zap, GitBranch, Cloud, Package, MessageSquare, Code2, Eye, Bot, Layers, Shield, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">AgentForge</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#providers" className="hover:text-white transition-colors">Providers</a>
            <a href="#stack" className="hover:text-white transition-colors">Stack</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">Sign in</Link>
            <Link href="/signup" className="text-sm bg-violet-600 hover:bg-violet-500 transition-colors px-4 py-2 rounded-lg font-medium">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-agent AI app builder — describe, generate, deploy</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Build full-stack apps
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              with AI agents
            </span>
          </h1>
          <p className="text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Describe your app in plain English. AgentForge orchestrates specialized AI agents to generate the codebase, preview it live, and deploy to Cloudflare — all in one workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-all px-8 py-4 rounded-xl font-semibold text-lg group">
              Start building free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="https://github.com" className="inline-flex items-center gap-2 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all px-8 py-4 rounded-xl font-semibold text-lg">
              <GitBranch className="w-5 h-5" />
              View on GitHub
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/30">Free tier available · GitHub Models · No credit card required</p>
        </div>
      </section>

      {/* Workflow strip */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
            {["Describe app idea", "→", "Orchestrator creates DAG", "→", "Agents generate code", "→", "QA validates", "→", "Preview live", "→", "Deploy to Cloudflare"].map((step, i) => (
              <span key={i} className={step === "→" ? "text-white/20" : "text-white/50"}>{step}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to ship</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">From prompt to production in one platform. No context switching, no manual wiring.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: MessageSquare, title: "Chat to build", desc: "Describe your app, then refine through conversation. Partial regen preserves your edits.", color: "violet" },
              { icon: Code2, title: "Live code editor", desc: "Browse the file tree, edit any generated file, and see changes reflected immediately.", color: "indigo" },
              { icon: Eye, title: "Instant preview", desc: "Every generation produces a live preview. No local setup required.", color: "cyan" },
              { icon: GitBranch, title: "GitHub push", desc: "One click to create a repo, commit all files, and push with a meaningful commit message.", color: "emerald" },
              { icon: Cloud, title: "Cloudflare deploy", desc: "Auto-detect Pages vs Workers. Generate wrangler config and CI/CD workflow automatically.", color: "blue" },
              { icon: Package, title: "ZIP export", desc: "Download your project as a clean ZIP with manifest, setup docs, and .env.example included.", color: "orange" },
              { icon: Layers, title: "Version history", desc: "Every generation creates a snapshot. Roll back to any version with one click.", color: "pink" },
              { icon: Zap, title: "Multi-provider routing", desc: "GitHub Models, Groq, Mistral, OpenRouter, HuggingFace — auto-fallback across providers.", color: "yellow" },
              { icon: Shield, title: "Secrets never leak", desc: "Provider keys stay server-side. RLS enforces per-user data isolation at the DB layer.", color: "red" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="group p-6 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 text-${color}-400`} />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">12 specialized agents</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">Each agent has a strict JSON contract, bounded retries, and provenance metadata on every file it generates.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { name: "Orchestrator", role: "DAG planning + task routing", primary: true },
              { name: "Product Manager", role: "Feature brief + milestones" },
              { name: "Architect", role: "System design + API plan" },
              { name: "UI/UX", role: "Design system + screens" },
              { name: "Frontend", role: "Pages, components, hooks" },
              { name: "Backend", role: "Routes, auth, server actions" },
              { name: "Database", role: "Schema, migrations, RLS" },
              { name: "AI Integration", role: "Provider abstraction" },
              { name: "GitHub", role: "Repo creation + push" },
              { name: "Cloudflare", role: "Deploy config + CI/CD" },
              { name: "QA", role: "Lint, typecheck, validate" },
              { name: "Repair", role: "Fix errors, preserve edits" },
            ].map(({ name, role, primary }) => (
              <div key={name} className={`p-4 rounded-xl border transition-all ${primary ? "border-violet-500/30 bg-violet-500/10" : "border-white/5 bg-white/[0.03] hover:border-white/10"}`}>
                <div className="font-medium text-sm mb-1">{name}</div>
                <div className="text-xs text-white/40">{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers */}
      <section id="providers" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">5 providers, smart routing</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">Each agent picks the best model for its task. Falls back automatically. Logs every call with provider, model, tokens, and latency.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { name: "GitHub Models", badge: "Free tier", desc: "gpt-4.1-mini · deepseek-v3 · phi-4 · codestral-25.01", highlight: true },
              { name: "Mistral", badge: "Code specialist", desc: "codestral-latest · mistral-medium · mistral-large" },
              { name: "Groq", badge: "Fast repair", desc: "llama-3.3-70b-versatile · qwen3-32b" },
              { name: "OpenRouter", badge: "Dynamic", desc: "Free + paid models · long context overflow" },
              { name: "Hugging Face", badge: "Fallback", desc: "Inference Providers · open model coverage" },
            ].map(({ name, badge, desc, highlight }) => (
              <div key={name} className={`p-5 rounded-2xl border ${highlight ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/5 bg-white/[0.03]"}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-semibold text-sm">{name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${highlight ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"}`}>{badge}</span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { mode: "Free Tier", order: "GitHub Models → OpenRouter → Groq → HuggingFace" },
                { mode: "Balanced", order: "OpenRouter → GitHub Models → Groq → Mistral" },
                { mode: "Fast Build", order: "Groq → GitHub Models → OpenRouter → Mistral" },
                { mode: "Quality", order: "Mistral → GitHub Models → OpenRouter → Groq" },
              ].map(({ mode, order }) => (
                <div key={mode}>
                  <div className="text-white/70 font-medium mb-1">{mode}</div>
                  <div className="text-xs text-white/30">{order}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section id="stack" className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Production-grade stack</h2>
          <p className="text-white/50 text-lg mb-12">No toy demos. Strict TypeScript, Zod validation, ESLint, Supabase RLS, and real CI/CD out of the box.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {["Next.js 15", "TypeScript", "Tailwind CSS", "shadcn/ui", "Supabase", "Supabase Auth", "Supabase Storage", "Supabase Realtime", "Zod", "Zustand", "React Hook Form", "Cloudflare Pages", "Cloudflare Workers", "GitHub Actions", "Octokit", "JSZip", "Vitest"].map(tech => (
              <span key={tech} className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white/70">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to build?</h2>
          <p className="text-white/50 text-lg mb-8">Start free with GitHub Models. Add Mistral and Groq for faster, higher-quality generation.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-all px-10 py-4 rounded-xl font-semibold text-lg group">
            Create your first app
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-indigo-600" />
            <span>AgentForge</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white/60 transition-colors">Docs</a>
            <a href="#" className="hover:text-white/60 transition-colors">GitHub</a>
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
          </div>
          <span>MIT License · Built with AgentForge</span>
        </div>
      </footer>
    </div>
  );
}
