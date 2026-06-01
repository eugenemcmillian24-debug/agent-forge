"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Bot, MessageSquare, Code2, Eye, Rocket, History,
  Settings, Zap, Download, ChevronLeft
} from "lucide-react";
import { ChatPanel }      from "./ChatPanel";
import { FileTree }       from "./FileTree";
import { CodeEditor }     from "./CodeEditor";
import { AgentTimeline }  from "./AgentTimeline";
import { DeployPanel }    from "./DeployPanel";
import { VersionHistory } from "./VersionHistory";
import { SettingsPanel }  from "./SettingsPanel";
import { PromptBar }      from "./PromptBar";
import { useAgentStream } from "@/hooks/useAgentStream";
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
  ready:      "badge-emerald",
  generating: "badge-violet",
  error:      "badge-red",
  draft:      "badge-white",
};
const STATUS_DOT: Record<string, string> = {
  ready:      "bg-emerald-400",
  generating: "bg-violet-400 animate-pulse",
  error:      "bg-red-400",
  draft:      "bg-white/20",
};

export function WorkspaceShell({ project, initialPanel = "chat" }: { project: Project; initialPanel?: Panel }) {
  const [panel,        setPanel]    = useState<Panel>(initialPanel);
  const [selectedFile, setFile]     = useState<string | null>(null);

  // Single stream instance shared across ChatPanel, PromptBar, and AgentTimeline
  const stream = useAgentStream(project.id);

  const showFileTree = panel === "editor" || panel === "chat";
  const badgeClass   = STATUS_STYLES[project.status] ?? STATUS_STYLES.draft;
  const dotClass     = STATUS_DOT[project.status]    ?? STATUS_DOT.draft;

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">

      {/* ── Top bar ── */}
      <header className="h-12 border-b border-white/[0.05] flex items-center px-3 gap-2 shrink-0 bg-[#0b0b14]">
        <Link href="/dashboard"
          className="flex items-center gap-1 text-white/25 hover:text-white/60 transition-colors p-1.5 rounded-lg hover:bg-white/[0.04] shrink-0 group">
          <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        </Link>

        <div className="flex items-center gap-2 pr-3 border-r border-white/[0.06] shrink-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-500/20">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold truncate max-w-[160px]">{project.name}</span>
          <span className={`badge ${badgeClass} flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            {project.status}
          </span>
        </div>

        <nav className="flex items-center flex-1 gap-0.5">
          {NAV.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setPanel(id)}
              className={`tab-item ${panel === id ? "active" : ""}`}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {stream.running && (
            <span className="text-xs text-violet-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/15 animate-pulse-ring">
              <Zap className="w-3 h-3" />
              Generating…
            </span>
          )}
          <button
            onClick={() => window.open(`/api/projects/${project.id}/export`, "_blank")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/65 hover:bg-white/[0.04] transition-all">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button onClick={() => setPanel("deploy")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-sm shadow-violet-500/20 font-medium">
            <Rocket className="w-3.5 h-3.5" />
            Deploy
          </button>
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="flex-1 flex overflow-hidden">
        {showFileTree && (
          <div className="w-52 border-r border-white/[0.05] shrink-0 overflow-hidden bg-[#0b0b14]">
            <FileTree
              projectId={project.id}
              selectedFile={selectedFile}
              onSelect={(f) => { setFile(f); setPanel("editor"); }}
            />
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {panel === "chat" && (
            <PromptBar projectId={project.id} stream={stream} />
          )}
          <div className="flex-1 overflow-hidden">
            {panel === "chat" && (
              <div className="flex h-full">
                <div className="flex-1 overflow-hidden">
                  <AgentTimeline projectId={project.id} stream={stream} />
                </div>
                <div className="w-80 border-l border-white/[0.05]">
                  <ChatPanel projectId={project.id} />
                </div>
              </div>
            )}
            {panel === "editor"   && <CodeEditor   projectId={project.id} filePath={selectedFile} />}
            {panel === "preview"  && <PreviewPanel projectId={project.id} />}
            {panel === "deploy"   && <DeployPanel  projectId={project.id} />}
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
      <div className="p-3 border-b border-white/[0.05] flex items-center gap-2 bg-[#0b0b14]">
        <Eye className="w-3.5 h-3.5 text-white/25" />
        <span className="text-sm font-medium text-white/60">Preview</span>
        <span className="ml-auto text-xs text-white/20">Connect Supabase to enable live preview</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-4">
            <Eye className="w-6 h-6 text-white/10" />
          </div>
          <p className="text-white/20 text-sm font-medium mb-1">Preview not available</p>
          <p className="text-white/12 text-xs">Renders after generation completes</p>
        </div>
      </div>
    </div>
  );
}
