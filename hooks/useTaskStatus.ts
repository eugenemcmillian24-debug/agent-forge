"use client";
import { useState, useEffect, useCallback } from "react";
import type { AgentTask } from "@/types/project";

export function useTaskStatus(projectId: string) {
  const [tasks,   setTasks]   = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const applyEvent = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string);

      switch (data.type) {
        case "snapshot":
          setTasks(data.tasks ?? []);
          setLoading(false);
          break;
        case "task.insert":
          setTasks(prev => [...prev, data.task]);
          break;
        case "task.update":
          setTasks(prev =>
            prev.map(t => (t.id === data.task.id ? { ...t, ...data.task } : t))
          );
          break;
        case "task.delete":
          setTasks(prev => prev.filter(t => t.id !== data.task.id));
          break;
        case "done":
        case "error":
          // Stream closed — fall through
          break;
      }
    } catch {
      // Malformed event — skip
    }
  }, []);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      // Fallback: one-shot fetch (no live updates)
      fetch(`/api/projects/${projectId}/tasks`)
        .then(r => (r.ok ? r.json() : []))
        .then(setTasks)
        .finally(() => setLoading(false));
      return;
    }

    const es = new EventSource(`/api/projects/${projectId}/tasks/stream`);

    es.onmessage = applyEvent;
    es.onopen    = () => setError(null);
    es.onerror   = () => setError("Lost connection to task stream — retrying…");

    return () => es.close();
  }, [projectId, applyEvent]);

  return { tasks, loading, error };
}
