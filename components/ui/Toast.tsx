"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number; // ms, 0 = persistent
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    icon: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
  },
  error: {
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    icon: <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
  },
  warning: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/25",
    icon: <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />,
  },
  info: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    icon: <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />,
  },
};

// ── Single toast item ─────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const { bg, border, icon } = VARIANT_STYLES[toast.variant];

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration === 0) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, onDismiss]);

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 w-full max-w-sm px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl shadow-black/40 transition-all duration-300 ${bg} ${border} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{toast.description}</p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="text-white/25 hover:text-white/60 transition-colors shrink-0 mt-0.5 p-0.5 rounded-md hover:bg-white/[0.06]">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Provider + portal ────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = uid();
    setToasts(prev => {
      // Max 3 toasts — drop oldest if over limit
      const next = [...prev, { ...opts, id }];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast portal — fixed bottom-right */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto w-full">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
