"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { springFast } from "@/lib/motion";

interface ToastData {
  id: number;
  message: string;
  tone?: "default" | "success";
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<(t: Omit<ToastData, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((t: Omit<ToastData, "id">) => {
    setToast({ ...t, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), toast.action ? 6000 : 3200);
    return () => clearTimeout(timer.current);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] lg:bottom-5 flex justify-center px-4" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={springFast}
              className="material pointer-events-auto flex max-w-md items-center gap-3 rounded-full py-2 pr-2 pl-5 text-sm font-medium shadow-float"
            >
              {toast.tone === "success" && <span className="size-2 shrink-0 rounded-full bg-green" />}
              <span className="py-1">{toast.message}</span>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.onClick();
                    setToast(null);
                  }}
                  className="pressable shrink-0 rounded-full bg-accent-tint px-3.5 py-1.5 font-semibold text-accent"
                >
                  {toast.action.label}
                </button>
              ) : (
                <span className="w-3" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
