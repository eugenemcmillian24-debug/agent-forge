"use client";
import { useState, useEffect, useCallback } from "react";
import type { AgentTask } from "@/types/project";

export function useTaskStatus(projectId: string, pollMs = 3000) {
  const [tasks, setTasks]     = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (res.ok) setTasks(await res.json());
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, pollMs);
    return () => clearInterval(interval);
  }, [load, pollMs]);

  return { tasks, loading };
}
