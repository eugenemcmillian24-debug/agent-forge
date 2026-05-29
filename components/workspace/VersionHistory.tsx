"use client";
import { useEffect, useState } from "react";
import { History, RotateCcw, Tag } from "lucide-react";

interface Version { id: string; version_num: number; label?: string; created_at: string; }

export function VersionHistory({ projectId }: { projectId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/versions`).then(r => r.json()).then(setVersions).catch(() => {}).finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-base font-semibold flex items-center gap-2"><History className="w-4 h-4 text-violet-400" /> Version History</h2>
        <p className="text-xs text-white/40 mt-1">Every generation creates a snapshot. Roll back any time.</p>
      </div>
      <div className="p-6">
        {loading && <div className="text-white/20 text-sm animate-pulse">Loading versions…</div>}
        {!loading && versions.length === 0 && (
          <div className="text-center py-12 text-white/20">
            <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No versions yet</p>
            <p className="text-xs mt-1">Versions are created after each generation run</p>
          </div>
        )}
        <div className="space-y-2">
          {versions.map((v, i) => (
            <div key={v.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${i === 0 ? "border-violet-500/30 bg-violet-500/5" : "border-white/5 bg-white/[0.02] hover:border-white/10"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-white/40"}`}>
                  v{v.version_num}
                </div>
                <div>
                  <p className="text-sm font-medium">{v.label ?? `Version ${v.version_num}`}</p>
                  <p className="text-xs text-white/30">{new Date(v.created_at).toLocaleString()}</p>
                </div>
                {i === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">current</span>}
              </div>
              {i > 0 && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all">
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
