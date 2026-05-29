"use client";
import { useState, useEffect, useCallback } from "react";
import type { ProjectFile } from "@/types/project";

export function useProjectFiles(projectId: string) {
  const [files, setFiles]     = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      if (res.ok) setFiles(await res.json());
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);
  return { files, loading, reload: load };
}
