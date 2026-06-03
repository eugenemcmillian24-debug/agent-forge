"use client";
import { useState, useCallback, useRef, useEffect } from "react";

export interface StreamEvent { type: string; [key: string]: unknown; }

export function useAgentStream(
  projectId: string,
  options?: { onError?: (message: string) => void }
) {
  const [events, setEvents]   = useState<StreamEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Stable ref so options changes don't invalidate startGeneration's useCallback
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

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
            // Only update running state on terminal events — not on every SSE message
            if (ev.type === "run.completed" || ev.type === "run.failed" || ev.type === "done") {
              if (ev.type === "run.failed") {
                const msg = String(ev.error ?? "Generation failed");
                setError(msg);
                optionsRef.current?.onError?.(msg);
              }
              setRunning(false);
            }
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      const msg = String(err);
      setError(msg);
      optionsRef.current?.onError?.(msg);
    } finally {
      setRunning(false);
    }
  }, [projectId]);

  return { events, running, error, startGeneration };
}
