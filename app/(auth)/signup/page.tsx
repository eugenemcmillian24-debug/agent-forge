"use client";
import { useState } from "react";
import Link from "next/link";
import { Bot, ArrowRight, CheckCircle, Zap, GitBranch, Shield, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function PasswordStrength({ password }: { password: string }) {
  if (!password.length) return null;
  const score = Math.min(4, Math.floor(password.length / 3));
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400"];
  const textColors = ["text-red-400", "text-orange-400", "text-yellow-400", "text-emerald-400"];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score - 1] : "bg-white/10"}`} />
        ))}
      </div>
      <p className={`text-[11px] ${textColors[score - 1] ?? "text-white/25"}`}>{labels[score - 1] ?? "Too short"}</p>
    </div>
  );
}

export default function SignupPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [name,     setName]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
  }

  if (done) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center max-w-sm animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2.5 tracking-tight">Check your email</h1>
        <p className="text-white/40 text-sm leading-relaxed mb-6">
          We sent a confirmation link to{" "}
          <span className="text-white/70 font-medium">{email}</span>.
          <br />Click it to activate your account.
        </p>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium">
          Back to sign in <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-[440px] shrink-0 flex-col justify-between p-12 border-r border-white/[0.05] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 via-transparent to-indigo-600/5 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-semibold text-[16px]">AgentForge</span>
        </div>

        <div className="relative">
          <h2 className="text-[2rem] font-bold tracking-tight mb-4 leading-snug">
            Start building<br />
            <span className="gradient-text">for free</span>
          </h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            No credit card required. Get started with GitHub Models and upgrade when you need more.
          </p>
          <div className="space-y-3">
            {[
              { icon: Zap,       text: "Free tier with GitHub Models" },
              { icon: GitBranch, text: "Push to GitHub in one click" },
              { icon: Shield,    text: "Per-user RLS data isolation" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-white/40">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
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
          <div className="flex lg:hidden justify-center mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Bot className="w-5.5 h-5.5 text-white" />
            </div>
          </div>

          <h1 className="text-[1.625rem] font-bold mb-1.5 tracking-tight">Create your account</h1>
          <p className="text-white/40 text-sm mb-8">Free forever with GitHub Models</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5 animate-fade-up">
                <span className="mt-0.5 shrink-0 text-base leading-none">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm text-white/55 font-medium">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="input-base" placeholder="Your name" autoComplete="name" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm text-white/55 font-medium">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="input-base" placeholder="you@example.com" autoComplete="email" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm text-white/55 font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  className="input-base pr-10" placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-all py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 group mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/35">
            Already have an account?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
