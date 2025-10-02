"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(({ title, description = "", type = "info", duration = 4000 }) => {
    const id = ++idRef.current;
    const t = { id, title, description, type };
    setToasts((prev) => {
      const next = [...prev, t];
      return next.slice(-4);
    });
    const timer = setTimeout(() => remove(id), duration);
    return () => clearTimeout(timer);
  }, [remove]);

  const api = useMemo(() => ({ toast, remove }), [toast, remove]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[2000] flex justify-center sm:justify-end px-3">
        <div className="flex w-full max-w-md flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={[
                "pointer-events-auto panel px-3 py-2 shadow-lg transition-all",
                t.type === "error" && "border-red-400/40 bg-red-900/70",
                t.type === "success" && "border-emerald-400/40 bg-emerald-900/70",
                t.type === "info" && "border-white/20 bg-neutral-900/80",
              ].filter(Boolean).join(" ")}
              role="status"
            >
              <div className="flex items-start gap-2">
                <span className="mt-[2px] text-xs opacity-80">
                  {t.type === "error" ? "⚠️" : t.type === "success" ? "✅" : "ℹ️"}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.title}</div>
                  {t.description ? (
                    <div className="text-xs opacity-80 break-words">{t.description}</div>
                  ) : null}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="ml-auto -mr-1 rounded px-2 py-0.5 text-xs opacity-70 hover:opacity-100"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
