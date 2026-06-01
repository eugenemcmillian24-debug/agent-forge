import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Bot, LayoutDashboard, Settings, LogOut, Plus } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const initials = (user.user_metadata?.display_name as string || user.email || "U")
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-white/[0.05] flex flex-col bg-[#0c0c14]">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/[0.05]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
            <Bot className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-[14px] tracking-tight">AgentForge</span>
        </div>

        {/* New project CTA */}
        <div className="px-3 pt-4 pb-2">
          <Link href="/new" className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-violet-600/90 hover:bg-violet-500 transition-all text-sm font-medium shadow-sm shadow-violet-500/20 hover:shadow-violet-500/30">
            <Plus className="w-3.5 h-3.5" />
            New project
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          <Link href="/dashboard" className="nav-item">
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Projects
          </Link>
          <Link href="/settings" className="nav-item">
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </Link>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/40 to-indigo-500/40 border border-violet-500/20 flex items-center justify-center text-[11px] font-bold text-violet-300 shrink-0">
              {initials}
            </div>
            <span className="text-xs text-white/40 truncate flex-1">{user.email}</span>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="nav-item w-full text-left">
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
