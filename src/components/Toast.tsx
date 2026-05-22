"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";
interface Toast { id: string; type: ToastType; title: string; message?: string }

interface ToastCtx { toast: (type: ToastType, title: string, message?: string) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(Ctx);

const ICONS   = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const COLORS  = {
  success: "border-l-[hsl(var(--green))]   bg-[hsl(var(--green-dim))]   text-[hsl(var(--green))]",
  error:   "border-l-[hsl(var(--red))]     bg-[hsl(var(--red-dim))]     text-[hsl(var(--red))]",
  warning: "border-l-[hsl(var(--orange))]  bg-[hsl(var(--orange-dim))]  text-[hsl(var(--orange))]",
  info:    "border-l-[hsl(var(--primary))] bg-[hsl(var(--primary-dim))] text-[hsl(var(--primary))]",
};

function ToastItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  const Icon = ICONS[t.type];
  const timerId = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerId.current = setTimeout(() => onRemove(t.id), 4000);
    return () => clearTimeout(timerId.current);
  }, [t.id, onRemove]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-[var(--radius)] border border-[hsl(var(--border))] border-l-4 shadow-xl
      bg-[hsl(var(--bg-card))] fade-up min-w-[280px] max-w-[360px] ${COLORS[t.type].split(" ").slice(0,1).join(" ")}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${COLORS[t.type].split(" ").slice(2).join(" ")}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[hsl(var(--text))]">{t.title}</p>
        {t.message && <p className="text-xs text-[hsl(var(--text-muted))] mt-0.5">{t.message}</p>}
      </div>
      <button onClick={() => onRemove(t.id)}
        className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) =>
    setToasts(p => p.filter(t => t.id !== id)), []);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(p => [...p.slice(-4), { id, type, title, message }]);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
