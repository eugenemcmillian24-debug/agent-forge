"use client";
import {
  createContext, useContext, useState, useCallback,
  useRef, ReactNode,
} from "react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
  id:       string;
  message:  string;
  variant:  ToastVariant;
  duration: number;
}

interface ToastCtx {
  toasts:  Toast[];
  toast:   (message: string, variant?: ToastVariant, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastCtx>({
  toasts:  [],
  toast:   () => {},
  dismiss: () => {},
});

let _counter = 0;
function uid() { return `toast-${++_counter}-${Date.now()}`; }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 4000) => {
      const id = uid();
      setToasts(prev => [...prev, { id, message, variant, duration }]);
      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration));
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastRenderer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ── Renderer ──────────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { bar: string; icon: string; label: string }> = {
  info:    { bar: "bg-blue-500",    icon: "ℹ",  label: "text-blue-400"    },
  success: { bar: "bg-emerald-500", icon: "✓",  label: "text-emerald-400" },
  warning: { bar: "bg-amber-500",   icon: "⚠",  label: "text-amber-400"   },
  error:   { bar: "bg-red-500",     icon: "✕",  label: "text-red-400"     },
};

function ToastRenderer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(t => {
        const s = VARIANT_STYLES[t.variant];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-[400px]
                       bg-[#18181f] border border-white/10 rounded-xl shadow-2xl
                       px-4 py-3 transition-all duration-200"
          >
            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${s.bar}`} />
            <span className={`text-sm font-bold flex-shrink-0 mt-0.5 ${s.label}`}>
              {s.icon}
            </span>
            <p className="text-sm text-white/80 leading-snug flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 mt-0.5 text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
