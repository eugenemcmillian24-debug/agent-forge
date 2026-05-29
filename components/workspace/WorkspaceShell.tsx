"use client";
import { useState } from "react";
import Link from "next/link";
import { Bot, MessageSquare, Code2, Eye, Rocket, History, Settings, ArrowLeft, Zap, Download, GitBranch } from "lucide-react";
import { ChatPanel }      from "./ChatPanel";
import { FileTree }       from "./FileTree";
import { CodeEditor }     from "./CodeEditor";
import { AgentTimeline }  from "./AgentTimeline";
import { DeployPanel }    from "./DeployPanel";
import { VersionHistory } from "./VersionHistory";
import { SettingsPanel }  from "./SettingsPanel";
import { PromptBar }      from "./PromptBar";
import type { Project }   from "@/types/project";

type Panel = "chat" | "editor" | "preview" | "deploy" | "history" | "settings";

const NAV: { id: Panel; icon: React.ElementType; label: string }[] = [
  { id: "chat",     icon: MessageSquare, label: "Chat"     },
  { id: "editor",   icon: Code2,         label: "Editor"   },
  { id: "preview",  icon: Eye,           label: "Preview"  },
  { id: "deploy",   icon: Rocket,        label: "Deploy"   },
  { id: "history",  icon: History,       label: "History"  },
  { id: "settings", icon: Settings,      label: "Settings" },
];

export function WorkspaceShell({ project, initialPanel = "chat" }: { project: Project; initialPanel?: Panel }) {
  const [panel, setPanel]           = useState<Panel>(initialPanel);
  const [selectedFile, setFile]     = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const showFileTree = panel === "editor" || panel === "chat";

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      {/* Top bar */}
      <header className="h-12 border-b border-white/5 flex items-center px-4 gap-4 shrink-0">
        <Link href="/dashboard" className="text-white/30 hover:text-white/60 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium truncate max-w-[200px]">{project.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            project.status === "ready"      ? "bg-emerald-500/10 text-emerald-400" :
            project.status === "generating" ? "bg-violet-500/10 text-violet-400 animate-pulse" :
            project.status === "error"      ? "bg-red-500/10 text-red-400" :
            "bg-white/5 text-white/30"
          }`}>{project.status}</span>
        </div>

        {/* Tab nav */}
        <nav className="flex items-center gap-1 ml-4">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setPanel(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                panel === id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {generating && <span className="text-xs text-violet-400 animate-pulse flex items-center gap-1"><Zap className="w-3 h-3" /> Generating…</span>}
          <button onClick={() => window.open(`/api/projects/${project.id}/export`, "_blank")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => setPanel("deploy")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 text-white transition-colors">
            <Rocket className="w-3.5 h-3.5" /> Deploy
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree — shown in chat + editor panels */}
        {showFileTree && (
          <div className="w-52 border-r border-white/5 shrink-0 overflow-hidden">
            <FileTree projectId={project.id} selectedFile={selectedFile} onSelect={(f) => { setFile(f); setPanel("editor"); }} />
          </div>
        )}

        {/* Center panel */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Prompt bar — shown in chat panel */}
          {panel === "chat" && (
            <PromptBar projectId={project.id} onGenerating={setGenerating} />
          )}
          <div className="flex-1 overflow-hidden">
            {panel === "chat"     && <div className="flex h-full"><div className="flex-1 overflow-hidden"><AgentTimeline projectId={project.id} /></div><div className="w-80 border-l border-white/5"><ChatPanel projectId={project.id} /></div></div>}
            {panel === "editor"   && <CodeEditor projectId={project.id} filePath={selectedFile} />}
            {panel === "preview"  && <PreviewPanel projectId={project.id} />}
            {panel === "deploy"   && <DeployPanel projectId={project.id} />}
            {panel === "history"  && <VersionHistory projectId={project.id} />}
            {panel === "settings" && <SettingsPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline preview panel (simple iframe)
function PreviewPanel({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/5 flex items-center gap-2">
        <Eye className="w-4 h-4 text-white/40" />
        <span className="text-sm text-white/60">Preview</span>
        <span className="text-xs text-white/20 ml-auto">Sandbox preview — connect real Supabase to enable</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
        Preview renders here after generation completes
      </div>
    </div>
  );
}
