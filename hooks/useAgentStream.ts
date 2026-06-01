"use client";
import { useState, useCallback, useRef } from "react";
import type { AgentTask } from "@/types/project";

export interface StreamEvent { type: string; [key: string]: unknown; }

/**
 * Manages a generation stream and keeps a live task list in sync.
 *
 * The generate endpoint emits SSE events including task_update events
 * that carry the latest task state. This hook merges those updates into
 * a tasks array so AgentTimeline can subscribe to the stream directly
 * instead of polling during an active run.
 */
export function useAgentStream(projectId: string) {
  const [events,  setEvents]  = useState<StreamEvent[]>([]);
  const [tasks,   setTasks]   = useState<AgentTask[]>([]);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Expose a ref so external consumers (useTaskStatus) can check if a
  // stream is currently active without subscribing to re-renders.
  const runningRef = useRef(false);

  function applyTaskUpdate(incoming: AgentTask) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === incoming.id);
      if (idx === -1) return [...prev, incoming];
      const next = [...prev];
      next[idx] = incoming;
      return next;
    });
  }

  const startGeneration = useCallback(async (prompt: string, routingProfile = "balanced") => {
    setRunning(true);
    runningRef.current = true;
    setError(null);
    setEvents([]);
    setTasks([]);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, routingProfile }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      if (!res.body) { setRunning(false); runningRef.current = false; return; }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as StreamEvent;
            setEvents(prev => [...prev, ev]);

            // Merge task updates into local state — eliminates polling lag
            if (ev.type === "task_update" && ev.task) {
              applyTaskUpdate(ev.task as AgentTask);
            }

            if (ev.type === "run.completed" || ev.type === "run.failed" || ev.type === "done") {
              if (ev.type === "run.failed") setError(String(ev.error ?? "Generation failed"));
              setRunning(false);
              runningRef.current = false;
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
      runningRef.current = false;
    }
  }, [projectId]);

  return { events, tasks, running, runningRef, error, startGeneration };
}
