"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Bot, MessageSquare, Code2, Eye, Rocket, History,
  Settings, ArrowLeft, Zap, Download, GitBranch
} from "lucide-react";
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

const STATUS_STYLES: Record<string, string> = {
  ready:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  generating: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  error:      "bg-red-500/10 text-red-400 border-red-500/20",
  draft:      "bg-white/5 text-white/30 border-white/10",
};

export function WorkspaceShell({ project, initialPanel = "chat" }: { project: Project; initialPanel?: Panel }) {
  const [panel, setPanel]           = useState<Panel>(initialPanel);
  const [selectedFile, setFile]     = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const showFileTree = panel === "editor" || panel === "chat";
  const statusStyle  = STATUS_STYLES[project.status] ?? STATUS_STYLES.draft;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">

      {/* ── Top bar ── */}
      <header className="h-11 border-b border-white/[0.05] flex items-center px-3 gap-3 shrink-0 bg-[#0c0c14]">
        <Link href="/dashboard" className="text-white/25 hover:text-white/60 transition-colors p-1 rounded-md hover:bg-white/5">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>

        {/* Project identity */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/[0.06]">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-500/20">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-medium truncate max-w-[180px]">{project.name}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${statusStyle}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              project.status === "generating" ? "bg-violet-400 animate-pulse" :
              project.status === "ready"      ? "bg-emerald-400" :
              project.status === "error"      ? "bg-red-400" : "bg-white/20"
            }`} />
            {project.status}
          </span>
        </div>

        {/* Tab nav */}
        <nav className="flex items-center border-b-0 flex-1">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setPanel(id)}
              className={`tab-item ${panel === id ? "active" : ""}`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          {generating && (
            <span className="text-xs text-violet-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/15">
              <Zap className="w-3 h-3 animate-pulse" />
              Generating…
            </span>
          )}
          <button
            onClick={() => window.open(`/api/projects/${project.id}/export`, "_blank")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/35 hover:text-white/70 hover:bg-white/5 transition-all">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button onClick={() => setPanel("deploy")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-sm shadow-violet-500/20">
            <Rocket className="w-3.5 h-3.5" />
            Deploy
          </button>
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree */}
        {showFileTree && (
          <div className="w-52 border-r border-white/[0.05] shrink-0 overflow-hidden bg-[#0c0c14]">
            <FileTree
              projectId={project.id}
              selectedFile={selectedFile}
              onSelect={(f) => { setFile(f); setPanel("editor"); }}
            />
          </div>
        )}

        {/* Center panel */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {panel === "chat" && (
            <PromptBar projectId={project.id} onGenerating={setGenerating} />
          )}
          <div className="flex-1 overflow-hidden">
            {panel === "chat" && (
              <div className="flex h-full">
                <div className="flex-1 overflow-hidden">
                  <AgentTimeline projectId={project.id} />
                </div>
                <div className="w-80 border-l border-white/[0.05]">
                  <ChatPanel projectId={project.id} />
                </div>
              </div>
            )}
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

function PreviewPanel({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-white/[0.05] flex items-center gap-2 bg-[#0c0c14]">
        <Eye className="w-3.5 h-3.5 text-white/30" />
        <span className="text-sm text-white/50">Preview</span>
        <span className="text-xs text-white/20 ml-auto">Connect real Supabase to enable live preview</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Eye className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/20 text-sm">Preview renders after generation completes</p>
        </div>
      </div>
    </div>
  );
}
