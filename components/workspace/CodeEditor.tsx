"use client";
import { useState, useEffect, useCallback } from "react";
import { Save, FileCode, Copy, Check, AlertTriangle, Files } from "lucide-react";

function useSafeToast() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useToast } = require("@/components/ui/Toast");
    return useToast();
  } catch {
    return { toast: () => {} };
  }
}

function getLanguageLabel(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript JSX", js: "JavaScript", jsx: "JavaScript JSX",
    css: "CSS", html: "HTML", json: "JSON", sql: "SQL", md: "Markdown",
    sh: "Shell", env: "Env", toml: "TOML", yaml: "YAML", yml: "YAML",
  };
  return map[ext] ?? ext.toUpperCase() || "Plain text";
}

export function CodeEditor({ projectId, filePath }: { projectId: string; filePath: string | null }) {
  const { toast } = useSafeToast();
  const [content,  setContent]  = useState("");
  const [original, setOriginal] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) return;
    setLoading(true); setError(null);
    fetch(`/api/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`)
      .then(r => r.json())
      .then(d => { setContent(d.content ?? ""); setOriginal(d.content ?? ""); })
      .catch(() => setError("Failed to load file"))
      .finally(() => setLoading(false));
  }, [projectId, filePath]);

  const handleSave = useCallback(async () => {
    if (!filePath || saving) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content }),
      });
      if (!res.ok) throw new Error("Save failed");
      setOriginal(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ variant: "success", title: "File saved", description: filePath.split("/").pop() });
    } catch {
      setError("Failed to save file");
      toast({ variant: "error", title: "Save failed", description: "Could not save " + (filePath.split("/").pop() ?? filePath) });
    } finally { setSaving(false); }
  }, [filePath, projectId, content, saving, toast]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (content !== original) handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, content, original]);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end   = el.selectionEnd;
      const next  = content.substring(0, start) + "  " + content.substring(end);
      setContent(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
    }
  }

  if (!filePath) return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4">
        <Files className="w-7 h-7 text-white/12" />
      </div>
      <p className="text-sm font-medium text-white/25 mb-1">No file selected</p>
      <p className="text-xs text-white/15">Pick a file from the tree on the left</p>
    </div>
  );

  const isDirty   = content !== original;
  const lang      = getLanguageLabel(filePath);
  const lineCount = content.split("\n").length;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] shrink-0 bg-[#0b0b14]">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileCode className="w-3.5 h-3.5 text-white/25 shrink-0" />
          <div className="flex items-center gap-1 text-xs font-mono min-w-0">
            {filePath.split("/").map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1 min-w-0">
                {i < arr.length - 1
                  ? <span className="text-white/20 shrink-0">{part}/</span>
                  : <span className="text-white/65 font-semibold truncate">{part}</span>}
              </span>
            ))}
          </div>
          {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" title="Unsaved changes" />}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {saved && <span className="flex items-center gap-1 text-xs text-emerald-400 animate-fade-in"><Check className="w-3 h-3" /> Saved</span>}
          {isDirty && !saved && <span className="text-xs text-amber-400/70 hidden sm:block">Unsaved</span>}
          <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/65 hover:bg-white/[0.04] transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={handleSave} disabled={!isDirty || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white/65 font-medium">
            {saving ? <span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/[0.07] border-b border-red-500/15 text-xs text-red-400 animate-fade-up shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 p-4 space-y-2">
          {[80, 65, 90, 55, 75, 40, 85].map((w, i) => (
            <div key={i} className="h-4 rounded bg-white/[0.03] animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-12 shrink-0 bg-[#0a0a0f] border-r border-white/[0.04] overflow-hidden py-4 select-none" aria-hidden="true">
            {content.split("\n").map((_, i) => (
              <div key={i} className="text-right pr-3 text-[11px] font-mono text-white/15 leading-relaxed" style={{ lineHeight: "1.625rem" }}>
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            value={content} onChange={e => setContent(e.target.value)} onKeyDown={handleKeyDown}
            spellCheck={false} autoCorrect="off" autoCapitalize="off"
            className="flex-1 bg-transparent text-sm font-mono text-white/80 px-4 py-4 resize-none focus:outline-none leading-relaxed caret-violet-400"
            style={{ tabSize: 2, lineHeight: "1.625rem" }}
          />
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/[0.04] shrink-0 bg-[#0b0b14]">
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-white/20 font-mono">{lang}</span>
          <span className="text-[10px] text-white/15 font-mono">{lineCount} lines</span>
        </div>
        <span className="text-[10px] text-white/15 font-mono">{isDirty ? "⌘S to save" : "UTF-8"}</span>
      </div>
    </div>
  );
}
