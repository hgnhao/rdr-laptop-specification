"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { project, spring } from "@/lib/motion";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

const noopSubscribe = () => () => {};

/**
 * Sheet modal yang bisa ditarik turun untuk ditutup. Keputusan tutup memakai
 * titik akhir yang diproyeksikan dari kecepatan, bukan posisi lepas saja.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer }: Props) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const controls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="sheet" className="fixed inset-0 z-50 flex items-end justify-center sm:px-6 sm:pt-10 sm:pb-6">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[var(--scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.75rem] bg-surface shadow-float outline-none sm:max-h-[min(860px,100%)] sm:max-w-3xl sm:rounded-[1.75rem]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={spring}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 1 }}
            onDragEnd={(_, info) => {
              const height = panelRef.current?.offsetHeight ?? 600;
              if (info.offset.y + project(info.velocity.y) > height * 0.45) onClose();
            }}
          >
            <div
              onPointerDown={(e) => controls.start(e)}
              className="shrink-0 cursor-grab touch-none px-5 pt-2 pb-1 select-none active:cursor-grabbing sm:px-7"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-fill-2" />
              <div className="mt-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id={titleId} className="type-title">
                    {title}
                  </h2>
                  {subtitle && <div className="mt-1.5 text-sm text-label-2">{subtitle}</div>}
                </div>
                <button
                  type="button"
                  aria-label="Tutup"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onClose}
                  className="pressable -mr-1 grid size-8 shrink-0 place-items-center rounded-full bg-fill text-label-2 hover:bg-fill-2"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-6 [mask-image:linear-gradient(to_bottom,transparent,black_1rem)] sm:px-7">{children}</div>
            {footer && (
              <div className="shrink-0 border-t border-separator px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
