"use client";
import { useState, useEffect, useCallback } from "react";
import type { ProjectFile } from "@/types/project";

async function fetchFiles(projectId: string): Promise<ProjectFile[]> {
  const res = await fetch(`/api/projects/${projectId}/files`);
  return res.ok ? res.json() : [];
}

export function useProjectFiles(projectId: string) {
  const [files,   setFiles]   = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles(projectId)
      .then(data => {
        setFiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const reload = useCallback(() => {
    setLoading(true);
    fetchFiles(projectId)
      .then(data => {
        setFiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  return { files, loading, reload };
}
