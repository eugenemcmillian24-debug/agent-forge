"use client";
import { useProjectFiles } from "@/hooks/useProjectFiles";
import { FileCode, Folder, RefreshCw } from "lucide-react";

const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-400", javascript: "text-yellow-400",
  css: "text-pink-400", html: "text-orange-400",
  json: "text-green-400", sql: "text-purple-400", markdown: "text-white/50",
};

function getLanguage(path: string): string {
  const ext = path.split(".").pop() ?? "";
  const map: Record<string, string> = { ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript", css: "css", html: "html", json: "json", sql: "sql", md: "markdown" };
  return map[ext] ?? "text";
}

function buildTree(files: Array<{ path: string }>) {
  const tree: Record<string, string[]> = {};
  for (const f of files) {
    const parts = f.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
    if (!tree[dir]) tree[dir] = [];
    tree[dir].push(f.path);
  }
  return tree;
}

export function FileTree({ projectId, selectedFile, onSelect }: { projectId: string; selectedFile: string | null; onSelect: (path: string) => void }) {
  const { files, loading, reload } = useProjectFiles(projectId);

  if (loading) return <div className="p-4 text-xs text-white/30 animate-pulse">Loading files…</div>;

  if (files.length === 0) return (
    <div className="p-4 text-center">
      <FileCode className="w-8 h-8 text-white/10 mx-auto mb-2" />
      <p className="text-xs text-white/30">No files yet</p>
      <p className="text-xs text-white/20 mt-1">Generate an app to see files here</p>
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs text-white/40 font-medium">FILES</span>
        <button onClick={reload} className="text-white/20 hover:text-white/50 transition-colors"><RefreshCw className="w-3 h-3" /></button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {Object.entries(dirs).map(([dir, paths]) => (
          <div key={dir}>
            {dir !== "(root)" && (
              <div className="flex items-center gap-1.5 px-3 py-1 mt-1">
                <Folder className="w-3 h-3 text-white/20" />
                <span className="text-xs text-white/30 font-medium truncate">{dir}</span>
              </div>
            )}
            {paths.map(path => {
              const filename = path.split("/").pop() ?? path;
              const lang = getLanguage(path);
              const color = LANG_COLORS[lang] ?? "text-white/50";
              return (
                <button key={path} onClick={() => onSelect(path)}
                  className={`w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-colors text-left ${selectedFile === path ? "bg-violet-500/10 text-violet-300" : "text-white/50 hover:text-white hover:bg-white/5"}`}>
                  <FileCode className={`w-3 h-3 shrink-0 ${color}`} />
                  <span className="truncate">{filename}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
