"use client";
import { useState, useEffect } from "react";
import { Rocket, GitBranch, Cloud, CheckCircle, Loader2, ExternalLink, XCircle, AlertTriangle } from "lucide-react";
import type { Deployment } from "@/types/project";

function timeAgo(date: string): string {
  const diff = new Date().getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DeployPanel({ projectId }: { projectId: string }) {
  const [deployments,  setDeployments]  = useState<Deployment[]>([]);
  const [pushing,      setPushing]      = useState(false);
  const [deploying,    setDeploying]    = useState(false);
  const [pushResult,   setPushResult]   = useState<{ repoUrl?: string; commitSha?: string; error?: string } | null>(null);
  const [deployResult, setDeployResult] = useState<{ deployUrl?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/deployments`).then(r => r.json()).then(setDeployments).catch(() => {});
  }, [projectId]);

  async function handleGitHubPush() {
    setPushing(true); setPushResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/github/push`, { method: "POST" });
      const d   = await res.json();
      setPushResult(res.ok ? d : { error: d.error });
    } catch (err) { setPushResult({ error: String(err) }); }
    finally { setPushing(false); }
  }

  async function handleCloudflareDeploy() {
    setDeploying(true); setDeployResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy/cloudflare`, { method: "POST" });
      const d   = await res.json();
      setDeployResult(res.ok ? d : { error: d.error });
      if (res.ok) {
        const r = await fetch(`/api/projects/${projectId}/deployments`);
        if (r.ok) setDeployments(await r.json());
      }
    } catch (err) { setDeployResult({ error: String(err) }); }
    finally { setDeploying(false); }
  }



  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-lg bg-violet-500/12 border border-violet-500/15 flex items-center justify-center">
            <Rocket className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <h2 className="text-base font-semibold">Deploy</h2>
        </div>
        <p className="text-xs text-white/35 ml-9">Push to GitHub and deploy to Cloudflare Pages</p>
      </div>

      <div className="p-6 space-y-4">
        {/* GitHub Push */}
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-white/50" />
            </div>
            <div>
              <p className="text-sm font-semibold">GitHub Push</p>
              <p className="text-xs text-white/35 mt-0.5">Create a repo and push all generated files</p>
            </div>
          </div>

          {pushResult?.repoUrl && (
            <a href={pushResult.repoUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              <ExternalLink className="w-3 h-3" />
              {pushResult.repoUrl}
            </a>
          )}
          {pushResult?.error && (
            <div className="flex items-start gap-2 text-xs text-red-400/90 bg-red-500/[0.06] border border-red-500/15 rounded-lg p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{pushResult.error}</span>
            </div>
          )}

          <button onClick={handleGitHubPush} disabled={pushing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.14] disabled:opacity-50 transition-all font-medium">
            {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
            {pushing ? "Pushing…" : "Push to GitHub"}
          </button>
        </div>

        {/* Cloudflare Deploy */}
        <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/15 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Cloudflare Pages</p>
              <p className="text-xs text-white/35 mt-0.5">Auto-detects static vs SSR. Generates wrangler config.</p>
            </div>
          </div>

          {deployResult?.deployUrl && (
            <a href={deployResult.deployUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              <ExternalLink className="w-3 h-3" />
              {deployResult.deployUrl}
            </a>
          )}
          {deployResult?.error && (
            <div className="flex items-start gap-2 text-xs text-red-400/90 bg-red-500/[0.06] border border-red-500/15 rounded-lg p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{deployResult.error}</span>
            </div>
          )}

          <button onClick={handleCloudflareDeploy} disabled={deploying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-orange-500/10 hover:bg-orange-500/18 border border-orange-500/20 hover:border-orange-500/30 disabled:opacity-50 transition-all text-orange-300 font-medium">
            {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {deploying ? "Deploying…" : "Deploy to Cloudflare"}
          </button>
        </div>

        {/* Deployment history */}
        {deployments.length > 0 && (
          <div>
            <h3 className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-3">Deployment History</h3>
            <div className="space-y-2">
              {deployments.slice(0, 5).map(d => (
                <div key={d.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-2.5">
                    {d.status === "deployed"  && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {d.status === "deploying" && <Loader2     className="w-3.5 h-3.5 text-violet-400 animate-spin shrink-0" />}
                    {d.status === "failed"    && <XCircle     className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className="text-xs text-white/55 capitalize">{d.target.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.deploy_url && (
                      <a href={d.deploy_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-violet-400/80 hover:text-violet-300 transition-colors truncate max-w-[140px]">
                        {d.deploy_url.replace("https://", "")}
                      </a>
                    )}
                    <span className="text-xs text-white/20 tabular-nums shrink-0">{timeAgo(d.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
