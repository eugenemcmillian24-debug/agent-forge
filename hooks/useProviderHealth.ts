"use client";
import { useState, useCallback } from "react";

export interface ProviderStatus {
  id: string; connected: boolean; lastError: string | null;
  status?: "ok" | "degraded" | "down"; latency?: number;
  models?: Record<string, string>;
}

export function useProviderHealth() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [testing, setTesting]     = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/providers");
    if (res.ok) { const d = await res.json(); setProviders(d.providers ?? []); }
  }, []);

  const runHealthChecks = useCallback(async () => {
    setTesting(true);
    const res = await fetch("/api/providers/test", { method: "POST" });
    const results = await res.json();
    setProviders(prev => prev.map(p => {
      const check = results.find((r: { provider: string }) => r.provider === p.id);
      return check ? { ...p, status: check.status, latency: check.latency_ms, lastError: check.error ?? null } : p;
    }));
    setTesting(false);
  }, []);

  return { providers, testing, load, runHealthChecks };
}
