"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ProjectFile } from "@/types/project";

async function fetchFiles(projectId: string): Promise<ProjectFile[]> {
  const res = await fetch(`/api/projects/${projectId}/files`);
  return res.ok ? res.json() : [];
}

export function useProjectFiles(projectId: string, filesVersion = 0) {
  const [files,   setFiles]   = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which version we last fetched to avoid redundant requests
  const lastFetchedVersion = useRef(-1);

  const doFetch = useCallback(() => {
    setLoading(true);
    fetchFiles(projectId)
      .then(data => { setFiles(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    // Only re-fetch if filesVersion has changed since last fetch
    if (filesVersion === lastFetchedVersion.current) return;
    lastFetchedVersion.current = filesVersion;
    doFetch();
  }, [projectId, filesVersion, doFetch]);

  // Manual reload (e.g. FileTree refresh button) — always fetches fresh
  const reload = useCallback(() => {
    lastFetchedVersion.current = -1;
    doFetch();
  }, [doFetch]);

  return { files, loading, reload };
}
