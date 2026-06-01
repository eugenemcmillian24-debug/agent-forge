"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eye, RefreshCw, ExternalLink, AlertTriangle, Code2, Globe, Zap } from "lucide-react";

type ProjectFile = { path: string; content: string | null; language: string | null };
type Project = { id: string; name: string; status: string; metadata: Record<string, unknown> };

type AppType = "static" | "nextjs" | "worker" | "unknown";

function detectAppType(files: ProjectFile[]): AppType {
  const paths = files.map((f) => f.path);
  if (paths.some((p) => p === "wrangler.toml" || p === "worker.ts" || p === "src/worker.ts")) {
    return "worker";
  }
  if (
    paths.some((p) => p === "next.config.ts" || p === "next.config.js" || p === "next.config.mjs") ||
    paths.some((p) => p.startsWith("app/") || p.startsWith("pages/"))
  ) {
    return "nextjs";
  }
  if (paths.some((p) => p === "index.html" || p === "public/index.html")) {
    return "static";
  }
  // Fallback: if there's any HTML file, treat as static
  if (paths.some((p) => p.endsWith(".html"))) return "static";
  return "unknown";
}

function buildStaticPreview(files: ProjectFile[]): string {
  const htmlFile =
    files.find((f) => f.path === "index.html") ||
    files.find((f) => f.path === "public/index.html") ||
    files.find((f) => f.path.endsWith(".html"));

  if (!htmlFile?.content) {
    return `<!DOCTYPE html><html><body style="font-family:system-ui;padding:2rem;background:#0a0a0f;color:#fff">
      <h2 style="color:#a78bfa">No HTML entry point found</h2>
      <p style="color:#6b7280">Generation complete but no index.html was produced. Try the Editor tab to inspect files.</p>
    </body></html>`;
  }

  let html = htmlFile.content;

  // Inline CSS files
  for (const file of files) {
    if (!file.path.endsWith(".css") || !file.content) continue;
    const tag = `<link rel="stylesheet" href="${file.path}">`;
    const altTag = `<link rel="stylesheet" href="./${file.path}">`;
    const inline = `<style>/* ${file.path} */\n${file.content}</style>`;
    html = html.replace(tag, inline).replace(altTag, inline);
  }

  // Inline JS files (simple scripts only — no bundling)
  for (const file of files) {
    if (!file.path.endsWith(".js") || file.path.includes("node_modules") || !file.content) continue;
    const tag = `<script src="${file.path}"></script>`;
    const altTag = `<script src="./${file.path}"></script>`;
    const inline = `<script>/* ${file.path} */\n${file.content}</script>`;
    html = html.replace(tag, inline).replace(altTag, inline);
  }

  return html;
}

export function PreviewPanel({ project, files }: { project: Project; files: ProjectFile[] }) {
  const [appType, setAppType]       = useState<AppType>("unknown");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [isLoading, setIsLoading]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const buildPreview = useCallback(() => {
    if (!files.length) return;
    setIsLoading(true);
    const type = detectAppType(files);
    setAppType(type);

    if (type === "static") {
      const html = buildStaticPreview(files);
      setPreviewHtml(html);
    }
    setIsLoading(false);
  }, [files]);

  useEffect(() => {
    buildPreview();
  }, [buildPreview, refreshKey]);

  // Write HTML into iframe via srcdoc
  useEffect(() => {
    if (appType === "static" && iframeRef.current && previewHtml) {
      iframeRef.current.srcdoc = previewHtml;
    }
  }, [appType, previewHtml]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (project.status === "draft" || project.status === "generating") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0a0a0f] text-white p-8">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
          <Eye className="w-8 h-8 text-violet-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-1">
            {project.status === "generating" ? "Generating your app…" : "No preview yet"}
          </h3>
          <p className="text-sm text-white/40 max-w-xs">
            {project.status === "generating"
              ? "The agents are building your codebase. Preview will appear here when generation completes."
              : "Describe your app in the Chat tab to start generating."}
          </p>
        </div>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#0a0a0f] text-white p-8">
        <AlertTriangle className="w-10 h-10 text-yellow-400" />
        <p className="text-sm text-white/60">No generated files found. Try running generation again.</p>
      </div>
    );
  }

  // ── App type banners ─────────────────────────────────────────────────────
  const AppTypeBadge = () => {
    const configs: Record<AppType, { icon: React.ElementType; label: string; color: string }> = {
      static:  { icon: Globe,  label: "Static HTML",      color: "text-emerald-400 bg-emerald-400/10" },
      nextjs:  { icon: Zap,    label: "Next.js App",       color: "text-violet-400 bg-violet-400/10"  },
      worker:  { icon: Code2,  label: "Cloudflare Worker", color: "text-orange-400 bg-orange-400/10"  },
      unknown: { icon: Eye,    label: "Preview",           color: "text-white/40 bg-white/5"          },
    };
    const cfg = configs[appType];
    const Icon = cfg.icon;
    return (
      <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
        <Icon className="w-3 h-3" /> {cfg.label}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="h-10 border-b border-white/[0.05] flex items-center px-3 gap-2 shrink-0 bg-[#0b0b14]">
        <AppTypeBadge />
        <div className="flex-1" />
        <button
          onClick={refresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors px-2 py-1 rounded hover:bg-white/5"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Preview area ── */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-xs text-white/40">Building preview…</p>
            </div>
          </div>
        )}

        {/* Static HTML preview */}
        {appType === "static" && (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title={`Preview: ${project.name}`}
          />
        )}

        {/* Next.js / full-stack apps — show instructions + deploy link */}
        {(appType === "nextjs" || appType === "worker") && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              {appType === "nextjs" ? (
                <Zap className="w-8 h-8 text-violet-400" />
              ) : (
                <Code2 className="w-8 h-8 text-orange-400" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {appType === "nextjs" ? "Next.js App" : "Cloudflare Worker"}
              </h3>
              <p className="text-sm text-white/50 max-w-sm mb-4">
                {appType === "nextjs"
                  ? "This app requires a Node.js runtime to run. Deploy it to Cloudflare to get a live preview URL, or download the ZIP and run it locally."
                  : "This Worker app must be deployed to Cloudflare to preview. Click Deploy to get a live URL in seconds."}
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={`/projects/${project.id}/deploy`}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Deploy to Cloudflare
                </a>
                <a
                  href={`/api/projects/${project.id}/export`}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium rounded-lg transition-colors border border-white/10"
                >
                  Download ZIP
                </a>
              </div>
            </div>

            {/* File count summary */}
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span>{files.length} files generated</span>
              <span>·</span>
              <span>{files.filter((f) => f.language === "typescript" || f.language === "tsx" || f.language === "ts").length} TypeScript files</span>
            </div>
          </div>
        )}

        {/* Unknown type fallback */}
        {appType === "unknown" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-yellow-400" />
            <div>
              <h3 className="text-base font-medium text-white mb-1">Preview unavailable</h3>
              <p className="text-sm text-white/40 max-w-xs">
                Could not determine app type from generated files. Check the Editor tab to inspect what was generated.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
