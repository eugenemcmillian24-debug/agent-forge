"use client";
import { useState, useCallback } from "react";

export interface StreamEvent { type: string; [key: string]: unknown; }

export function useAgentStream(projectId: string) {
  const [events, setEvents]   = useState<StreamEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const startGeneration = useCallback(async (prompt: string, routingProfile = "balanced") => {
    setRunning(true); setError(null); setEvents([]);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, routingProfile }),
      });
      if (!res.body) { setRunning(false); return; }
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const ev = JSON.parse(line.slice(6)) as StreamEvent;
            setEvents(prev => [...prev, ev]);
            if (ev.type === "run.completed" || ev.type === "run.failed" || ev.type === "done") {
              if (ev.type === "run.failed") setError(String(ev.error ?? "Generation failed"));
              setRunning(false);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) { setError(String(err)); }
    finally { setRunning(false); }
  }, [projectId]);

  return { events, running, error, startGeneration };
}
