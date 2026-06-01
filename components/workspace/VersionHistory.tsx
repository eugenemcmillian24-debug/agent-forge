"use client";
import { useEffect, useState } from "react";
import { History, RotateCcw, Clock, Sparkles, GitCompare, X, ChevronRight } from "lucide-react";

interface Version { id: string; version_num: number; label?: string; created_at: string; }
interface FileDiff { path: string; before: string; after: string; }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function computeLineDiff(before: string, after: string): { line: string; type: "added" | "removed" | "same" }[] {
  const beforeLines = before.split("\n");
  const afterLines  = after.split("\n");
  const result: { line: string; type: "added" | "removed" | "same" }[] = [];

  // Simple LCS-based diff (good enough for code review)
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  let i = 0, j = 0;
  while (i < beforeLines.length || j < afterLines.length) {
    const b = beforeLines[i];
    const a = afterLines[j];
    if (i >= beforeLines.length) {
      result.push({ line: a, type: "added" });
      j++;
    } else if (j >= afterLines.length) {
      result.push({ line: b, type: "removed" });
      i++;
    } else if (b === a) {
      result.push({ line: b, type: "same" });
      i++; j++;
    } else {
      result.push({ line: b, type: "removed" });
      result.push({ line: a, type: "added" });
      i++; j++;
    }
    if (result.length > 2000) break; // Safety cap
  }
  return result;
}

function DiffModal({ versionA, versionB, projectId, onClose }: {
  versionA: Version; versionB: Version; projectId: string; onClose: () => void;
}) {
  const [diffs,   setDiffs]   = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [aRes, bRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/files?versionId=${versionA.id}`),
          fetch(`/api/projects/${projectId}/files?versionId=${versionB.id}`),
        ]);
        const [aFiles, bFiles]: Array<Array<{ path: string; content: string }>> = await Promise.all([
          aRes.ok ? aRes.json() : [],
          bRes.ok ? bRes.json() : [],
        ]);

        const allPaths = new Set([...aFiles.map(f => f.path), ...bFiles.map(f => f.path)]);
        const computed: FileDiff[] = [];
        for (const path of allPaths) {
          const before = aFiles.find(f => f.path === path)?.content ?? "";
          const after  = bFiles.find(f => f.path === path)?.content ?? "";
          if (before !== after) computed.push({ path, before, after });
        }
        setDiffs(computed);
        if (computed.length > 0) setSelectedFile(computed[0].path);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, versionA.id, versionB.id]);

  const currentDiff = diffs.find(d => d.path === selectedFile);
  const lines = currentDiff ? computeLineDiff(currentDiff.before, currentDiff.after) : [];
  const added   = lines.filter(l => l.type === "added").length;
  const removed = lines.filter(l => l.type === "removed").length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0e0e1a] border border-white/[0.08] rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <GitCompare className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold">
              v{versionA.version_num} → v{versionB.version_num}
            </span>
            <span className="text-xs text-white/25">{diffs.length} file{diffs.length !== 1 ? "s" : ""} changed</span>
            {added > 0   && <span className="text-xs text-emerald-400 font-mono">+{added}</span>}
            {removed > 0 && <span className="text-xs text-red-400 font-mono">-{removed}</span>}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/25 text-sm">
            Loading diff…
          </div>
        ) : diffs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white/25 text-sm">
            No differences between these versions.
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* File list sidebar */}
            <div className="w-52 border-r border-white/[0.06] overflow-y-auto shrink-0 py-2">
              {diffs.map(d => {
                const filename = d.path.split("/").pop() ?? d.path;
                const diffLines = computeLineDiff(d.before, d.after);
                const a = diffLines.filter(l => l.type === "added").length;
                const r = diffLines.filter(l => l.type === "removed").length;
                return (
                  <button key={d.path} onClick={() => setSelectedFile(d.path)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 ${
                      selectedFile === d.path ? "bg-violet-500/10 text-violet-200" : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                    }`}>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{filename}</span>
                    <span className="text-emerald-400 font-mono text-[10px] shrink-0">+{a}</span>
                    <span className="text-red-400 font-mono text-[10px] shrink-0">-{r}</span>
                  </button>
                );
              })}
            </div>

            {/* Diff viewer */}
            <div className="flex-1 overflow-auto font-mono text-xs">
              {currentDiff && (
                <>
                  <div className="px-4 py-2 border-b border-white/[0.05] text-white/30 text-[11px] bg-[#0b0b14] sticky top-0">
                    {currentDiff.path}
                  </div>
                  <table className="w-full border-collapse">
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i} className={
                          l.type === "added"   ? "bg-emerald-500/[0.08]" :
                          l.type === "removed" ? "bg-red-500/[0.08]" : ""
                        }>
                          <td className={`pl-3 pr-2 py-0.5 select-none text-[10px] w-6 text-right border-r border-white/[0.04] ${
                            l.type === "added" ? "text-emerald-500/60" : l.type === "removed" ? "text-red-500/60" : "text-white/15"
                          }`}>
                            {l.type === "added" ? "+" : l.type === "removed" ? "−" : " "}
                          </td>
                          <td className={`px-4 py-0.5 whitespace-pre leading-relaxed ${
                            l.type === "added" ? "text-emerald-300" : l.type === "removed" ? "text-red-300" : "text-white/55"
                          }`}>
                            {l.line || " "}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function VersionHistory({ projectId }: { projectId: string }) {
  const [versions,  setVersions]  = useState<Version[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [diffPair,  setDiffPair]  = useState<[Version, Version] | null>(null);
  const [selectingDiff, setSelectingDiff] = useState<Version | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/versions`)
      .then(r => r.json()).then(setVersions).catch(() => {}).finally(() => setLoading(false));
  }, [projectId]);

  async function handleRestore(versionId: string) {
    if (!confirm("Restore this version? Your current files will be replaced.")) return;
    setRestoring(versionId);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (res.ok) {
        const r = await fetch(`/api/projects/${projectId}/versions`);
        if (r.ok) setVersions(await r.json());
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Restore failed");
      }
    } catch { alert("Restore failed — check your connection"); }
    finally { setRestoring(null); }
  }

  function handleDiffClick(v: Version) {
    if (!selectingDiff) {
      setSelectingDiff(v);
    } else if (selectingDiff.id === v.id) {
      setSelectingDiff(null);
    } else {
      // Show diff: older version first
      const [a, b] = selectingDiff.version_num < v.version_num
        ? [selectingDiff, v] : [v, selectingDiff];
      setDiffPair([a, b]);
      setSelectingDiff(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-violet-500/12 border border-violet-500/15 flex items-center justify-center">
            <History className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <h2 className="text-base font-semibold">Version History</h2>
        </div>
        <p className="text-xs text-white/35 ml-9">Every generation creates a snapshot. Roll back or compare any time.</p>
      </div>

      {/* Diff selection hint */}
      {selectingDiff && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 flex items-center gap-2">
          <GitCompare className="w-3.5 h-3.5 shrink-0" />
          Now click another version to compare with <strong>v{selectingDiff.version_num}</strong>
          <button onClick={() => setSelectingDiff(null)} className="ml-auto text-violet-400/60 hover:text-violet-300">✕</button>
        </div>
      )}

      <div className="p-6">
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
            ))}
          </div>
        )}

        {!loading && versions.length === 0 && (
          <div className="text-center py-14">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-4">
              <History className="w-6 h-6 text-white/15" />
            </div>
            <p className="text-sm font-medium text-white/25 mb-1.5">No versions yet</p>
            <p className="text-xs text-white/15 leading-relaxed">Versions are created after each generation run</p>
          </div>
        )}

        <div className="space-y-2.5">
          {versions.map((v, i) => (
            <div key={v.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                selectingDiff?.id === v.id
                  ? "border-violet-500/40 bg-violet-500/[0.08]"
                  : i === 0
                  ? "border-violet-500/25 bg-violet-500/[0.05]"
                  : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.09] hover:bg-white/[0.03]"
              }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  i === 0 ? "bg-violet-500/20 text-violet-300 border border-violet-500/25" : "bg-white/[0.04] text-white/35 border border-white/[0.06]"
                }`}>
                  v{v.version_num}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold leading-tight">{v.label ?? `Version ${v.version_num}`}</p>
                    {i === 0 && (
                      <span className="badge badge-violet flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> current
                      </span>
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-white/25 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {timeAgo(v.created_at)} · {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                {/* Compare button */}
                {versions.length > 1 && (
                  <button
                    onClick={() => handleDiffClick(v)}
                    title={selectingDiff ? "Compare with this version" : "Select to compare"}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                      selectingDiff?.id === v.id
                        ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                        : "text-white/25 border-transparent hover:text-white hover:bg-white/[0.05] hover:border-white/[0.08]"
                    }`}>
                    <GitCompare className="w-3 h-3" />
                    {selectingDiff && selectingDiff.id !== v.id ? "Compare" : "Diff"}
                  </button>
                )}

                {/* Restore button — not on current version */}
                {i > 0 && (
                  <button
                    onClick={() => handleRestore(v.id)}
                    disabled={restoring === v.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/35 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] disabled:opacity-50 transition-all">
                    {restoring === v.id
                      ? <span className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                      : <RotateCcw className="w-3 h-3" />
                    }
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diff modal */}
      {diffPair && (
        <DiffModal
          versionA={diffPair[0]}
          versionB={diffPair[1]}
          projectId={projectId}
          onClose={() => setDiffPair(null)}
        />
      )}
    </div>
  );
}
