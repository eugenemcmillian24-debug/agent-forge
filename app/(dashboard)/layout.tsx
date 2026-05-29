import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Bot, LayoutDashboard, Settings, LogOut } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">AgentForge</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <LayoutDashboard className="w-4 h-4" /> Projects
          </Link>
          <Link href="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <Settings className="w-4 h-4" /> Settings
          </Link>
        </nav>
        <div className="p-3 border-t border-white/5">
          <div className="px-3 py-2 text-xs text-white/30 truncate">{user.email}</div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
