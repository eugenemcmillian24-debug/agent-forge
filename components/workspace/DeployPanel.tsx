"use client";
import { useState, useEffect } from "react";
import { Rocket, GitBranch, Cloud, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import type { Deployment } from "@/types/project";

export function DeployPanel({ projectId }: { projectId: string }) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [pushing,     setPushing]     = useState(false);
  const [deploying,   setDeploying]   = useState(false);
  const [pushResult,  setPushResult]  = useState<{ repoUrl?: string; commitSha?: string; error?: string } | null>(null);
  const [deployResult,setDeployResult]= useState<{ deployUrl?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/deployments`).then(r => r.json()).then(setDeployments).catch(() => {});
  }, [projectId]);

  async function handleGitHubPush() {
    setPushing(true); setPushResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/github/push`, { method: "POST" });
      const d = await res.json();
      setPushResult(res.ok ? d : { error: d.error });
    } catch (err) { setPushResult({ error: String(err) }); }
    finally { setPushing(false); }
  }

  async function handleCloudflareDeploy() {
    setDeploying(true); setDeployResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy/cloudflare`, { method: "POST" });
      const d = await res.json();
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
      <div className="px-6 py-4 border-b border-white/5">
        <h2 className="text-base font-semibold flex items-center gap-2"><Rocket className="w-4 h-4 text-violet-400" /> Deploy</h2>
        <p className="text-xs text-white/40 mt-1">Push to GitHub and deploy to Cloudflare</p>
      </div>
      <div className="p-6 space-y-5">
        {/* GitHub Push */}
        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-white/50" />
            <span className="text-sm font-medium">GitHub Push</span>
          </div>
          <p className="text-xs text-white/40">Create a repo and push all generated files with a single commit.</p>
          {pushResult?.repoUrl && (
            <a href={pushResult.repoUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline">
              <ExternalLink className="w-3 h-3" /> {pushResult.repoUrl}
            </a>
          )}
          {pushResult?.error && <p className="text-xs text-red-400">{pushResult.error}</p>}
          <button onClick={handleGitHubPush} disabled={pushing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 disabled:opacity-50 transition-all">
            {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
            {pushing ? "Pushing…" : "Push to GitHub"}
          </button>
        </div>

        {/* Cloudflare Deploy */}
        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] space-y-3">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-medium">Cloudflare Pages</span>
          </div>
          <p className="text-xs text-white/40">Deploy to Cloudflare Pages. Auto-detects static vs SSR app.</p>
          {deployResult?.deployUrl && (
            <a href={deployResult.deployUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline">
              <ExternalLink className="w-3 h-3" /> {deployResult.deployUrl}
            </a>
          )}
          {deployResult?.error && <p className="text-xs text-red-400">{deployResult.error}</p>}
          <button onClick={handleCloudflareDeploy} disabled={deploying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/30 disabled:opacity-50 transition-all text-orange-300">
            {deploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            {deploying ? "Deploying…" : "Deploy to Cloudflare"}
          </button>
        </div>

        {/* Deployment history */}
        {deployments.length > 0 && (
          <div>
            <h3 className="text-xs text-white/40 font-medium mb-2">DEPLOYMENT HISTORY</h3>
            <div className="space-y-2">
              {deployments.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    {d.status === "deployed" ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : d.status === "deploying" ? <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    <span className="text-xs text-white/60">{d.target.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.deploy_url && <a href={d.deploy_url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline">{d.deploy_url.replace("https://","")}</a>}
                    <span className="text-xs text-white/20">{new Date(d.created_at).toLocaleDateString()}</span>
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

function XCircle({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l-6 6M9 9l6 6" /></svg>;
}
