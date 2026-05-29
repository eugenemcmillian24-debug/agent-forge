"use client";
import { useState, useEffect } from "react";
import { Save, FileCode } from "lucide-react";

export function CodeEditor({ projectId, filePath }: { projectId: string; filePath: string | null }) {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    if (!filePath) return;
    setLoading(true);
    fetch(`/api/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`)
      .then(r => r.json())
      .then(d => { setContent(d.content ?? ""); setOriginal(d.content ?? ""); })
      .finally(() => setLoading(false));
  }, [projectId, filePath]);

  async function handleSave() {
    if (!filePath) return;
    setSaving(true);
    await fetch(`/api/projects/${projectId}/files`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, content }),
    });
    setOriginal(content); setSaved(true); setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!filePath) return (
    <div className="flex flex-col items-center justify-center h-full text-white/20">
      <FileCode className="w-12 h-12 mb-3" />
      <p className="text-sm">Select a file from the tree</p>
    </div>
  );

  const isDirty = content !== original;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
        <span className="text-xs text-white/50 font-mono">{filePath}</span>
        <div className="flex items-center gap-2">
          {isDirty && <span className="text-xs text-amber-400">unsaved</span>}
          {saved   && <span className="text-xs text-emerald-400">saved ✓</span>}
          <button onClick={handleSave} disabled={!isDirty || saving}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors text-white/60">
            <Save className="w-3 h-3" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-white/20 text-sm animate-pulse">Loading…</div>
      ) : (
        <textarea
          value={content} onChange={e => setContent(e.target.value)}
          spellCheck={false}
          className="flex-1 bg-transparent text-sm font-mono text-white/80 p-4 resize-none focus:outline-none leading-relaxed"
          style={{ tabSize: 2 }}
        />
      )}
    </div>
  );
}
