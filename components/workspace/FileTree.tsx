"use client";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { FileCode, Folder, RefreshCw, Files } from "lucide-react";

const LANG_COLORS: Record<string, string> = {
  typescript:  "text-blue-400",
  javascript:  "text-yellow-400",
  css:         "text-pink-400",
  html:        "text-orange-400",
  json:        "text-green-400",
  sql:         "text-purple-400",
  markdown:    "text-white/40",
};

function getLanguage(path: string): string {
  const ext = path.split(".").pop() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    css: "css", html: "html", json: "json", sql: "sql", md: "markdown",
  };
  return map[ext] ?? "text";
}

export function FileTree({ projectId, selectedFile, onSelect }: {
  projectId: string;
  selectedFile: string | null;
  onSelect: (path: string) => void;
}) {
  const { files, loading, reload } = useProjectFiles(projectId);

  if (loading) return (
    <div className="p-4 space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-5 rounded-md bg-white/[0.04] animate-pulse" style={{ width: `${60 + i * 8}%` }} />
      ))}
    </div>
  );

  if (files.length === 0) return (
    <div className="p-5 text-center">
      <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-3">
        <Files className="w-5 h-5 text-white/15" />
      </div>
      <p className="text-xs text-white/25 font-medium mb-1">No files yet</p>
      <p className="text-[11px] text-white/15 leading-relaxed">Generate an app to see files here</p>
    </div>
  );

  // Group by directory
  const dirs: Record<string, string[]> = {};
  for (const f of files) {
    const parts = f.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
    if (!dirs[dir]) dirs[dir] = [];
    dirs[dir].push(f.path);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
        <span className="text-[10px] font-semibold text-white/25 tracking-widest uppercase">Files</span>
        <button onClick={reload}
          className="text-white/20 hover:text-white/50 transition-colors p-1 rounded-md hover:bg-white/[0.04]">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {Object.entries(dirs).map(([dir, paths]) => (
          <div key={dir}>
            {dir !== "(root)" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 mt-0.5">
                <Folder className="w-3 h-3 text-white/20 shrink-0" />
                <span className="text-[11px] text-white/30 font-medium truncate">{dir}</span>
              </div>
            )}
            {paths.map(path => {
              const filename = path.split("/").pop() ?? path;
              const lang  = getLanguage(path);
              const color = LANG_COLORS[lang] ?? "text-white/40";
              const isSelected = selectedFile === path;
              return (
                <button key={path} onClick={() => onSelect(path)}
                  className={`w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-all text-left group ${
                    isSelected
                      ? "bg-violet-500/12 text-violet-200 border-r-2 border-violet-400"
                      : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}>
                  <FileCode className={`w-3 h-3 shrink-0 ${isSelected ? "text-violet-400" : color}`} />
                  <span className="truncate">{filename}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/[0.04]">
        <p className="text-[10px] text-white/15 tabular-nums">{files.length} file{files.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}
