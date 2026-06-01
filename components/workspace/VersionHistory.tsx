"use client";
import { useEffect, useState } from "react";
import { History, RotateCcw, Clock, Sparkles } from "lucide-react";

interface Version { id: string; version_num: number; label?: string; created_at: string; }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function VersionHistory({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/versions`)
      .then(r => r.json()).then(setVersions).catch(() => {}).finally(() => setLoading(false));
  }, [projectId]);

  async function handleRestore(versionId: string) {
    setRestoring(versionId);
    // restore logic would go here
    await new Promise(r => setTimeout(r, 800));
    setRestoring(null);
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
        <p className="text-xs text-white/35 ml-9">Every generation creates a snapshot. Roll back any time.</p>
      </div>

      <div className="p-6">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && versions.length === 0 && (
          <div className="text-center py-14">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto mb-4">
              <History className="w-6 h-6 text-white/15" />
            </div>
            <p className="text-sm font-medium text-white/25 mb-1.5">No versions yet</p>
            <p className="text-xs text-white/15 leading-relaxed">Versions are created after each generation run</p>
          </div>
        )}

        {/* Version list */}
        <div className="space-y-2.5">
          {versions.map((v, i) => (
            <div key={v.id}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                i === 0
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
          ))}
        </div>
      </div>
    </div>
  );
}
