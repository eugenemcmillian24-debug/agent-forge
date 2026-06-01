"use client";
import { useState } from "react";
import Link from "next/link";
import { Bot, ArrowRight, Zap, GitBranch, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[480px] shrink-0 flex-col justify-between p-12 border-r border-white/[0.05] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 via-transparent to-indigo-600/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-600/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-[16px]">AgentForge</span>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight mb-4 leading-snug">
            Build apps with<br />
            <span className="gradient-text">AI agents</span>
          </h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            Describe your app in plain English. 12 specialized agents generate the full codebase, ready to deploy.
          </p>
          <div className="space-y-3">
            {[
              { icon: Zap,       text: "Free tier with GitHub Models" },
              { icon: GitBranch, text: "Push to GitHub in one click" },
              { icon: Shield,    text: "Per-user RLS data isolation" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white/40">
                <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-violet-400" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/20">© 2026 AgentForge · MIT License</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Bot className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1 tracking-tight">Welcome back</h1>
          <p className="text-white/40 text-sm mb-8">Sign in to your AgentForge account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm text-white/55 font-medium">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="input-base"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm text-white/55 font-medium">Password</label>
                <a href="#" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Forgot password?</a>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="input-base"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 group mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/35">
            No account?{" "}
            <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
