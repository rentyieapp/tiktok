import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (title: string, options?: { kind?: ToastKind; description?: string }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, options?: { kind?: ToastKind; description?: string }) => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [
        ...current.slice(-3),
        { id, kind: options?.kind ?? 'info', title, description: options?.description },
      ]);
      window.setTimeout(() => remove(id), 4600);
    },
    [remove],
  );

  const success = useCallback(
    (title: string, description?: string) => toast(title, { kind: 'success', description }),
    [toast],
  );
  const error = useCallback(
    (title: string, description?: string) => toast(title, { kind: 'error', description }),
    [toast],
  );

  const value = useMemo<ToastContextValue>(() => ({ toast, success, error }), [toast, success, error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-5 sm:top-5 sm:items-end">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3.5 shadow-float backdrop-blur animate-fade-up ${
              item.kind === 'success'
                ? 'border-brand-200 bg-white/95'
                : item.kind === 'error'
                  ? 'border-red-200 bg-white/95'
                  : 'border-ink-200 bg-white/95'
            }`}
          >
            <span
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                item.kind === 'success'
                  ? 'bg-brand-100 text-brand-600'
                  : item.kind === 'error'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-ink-100 text-ink-600'
              }`}
            >
              {item.kind === 'success' ? (
                <CheckCircle2 size={15} />
              ) : item.kind === 'error' ? (
                <AlertTriangle size={15} />
              ) : (
                <Info size={15} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Bildirimi kapat"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast ToastProvider içinde kullanılmalıdır.');
  return context;
}
