"use client";

import { Check, Maximize, Minus, Plus, X } from "lucide-react";
import { animate, motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { spring } from "@/lib/motion";
import { formatCondition } from "@/lib/rdr/attributes";
import type { InferenceResult, KnowledgeBase } from "@/lib/rdr/types";
import { layoutTree, NODE_W, SLOT_H, SLOT_W } from "@/lib/treeLayout";

interface Props {
  kb: KnowledgeBase;
  trace: InferenceResult | null;
  selectedId: number;
  onSelect: (id: number) => void;
}

const MIN_SCALE = 0.3;
const READABLE_SCALE = 0.62;
const LEGEND_ROOM = 44;
const MAX_SCALE = 1.6;
const EDGE_MARGIN = 72;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function TreeCanvas({ kb, trace, selectedId, onSelect }: Props) {
  const layout = useMemo(() => layoutTree(kb, trace?.stop ?? null), [kb, trace?.stop]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [scaleState, setScaleState] = useState(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const contentOpacity = useMotionValue(0);
  const downAt = useRef<{ x: number; y: number } | null>(null);

  const path = useMemo(() => {
    if (!trace) return null;
    const steps = new Map(trace.steps.map((s) => [s.nodeId, s]));
    const edges = new Set<string>();
    for (const s of trace.steps) edges.add(`${s.nodeId}-${s.satisfied ? "true" : "false"}`);
    return { steps, edges, firedId: trace.firedId };
  }, [trace]);

  const constraints = useMemo(() => {
    const sw = layout.width * scaleState;
    const sh = layout.height * scaleState;
    const axis = (view: number, size: number) => {
      const a = view - size - EDGE_MARGIN;
      return [Math.min(EDGE_MARGIN, a), Math.max(EDGE_MARGIN, a)] as const;
    };
    const [left, right] = axis(viewport.w, sw);
    const [top, bottom] = axis(viewport.h, sh);
    return { left, right, top, bottom };
  }, [layout.width, layout.height, scaleState, viewport]);

  const zoomTo = useCallback(
    (next: number, origin?: { x: number; y: number }, instant = false) => {
      const s = clamp(next, MIN_SCALE, MAX_SCALE);
      const o = origin ?? { x: viewport.w / 2, y: viewport.h / 2 };
      const current = scale.get();
      const nx = o.x - (o.x - x.get()) * (s / current);
      const ny = o.y - (o.y - y.get()) * (s / current);
      setScaleState(s);
      if (instant) {
        scale.set(s);
        x.set(nx);
        y.set(ny);
      } else {
        animate(scale, s, spring);
        animate(x, nx, spring);
        animate(y, ny, spring);
      }
    },
    [viewport, scale, x, y],
  );

  const fit = useCallback(
    (mode: "width" | "all", instant = false) => {
      if (!viewport.w) return;
      const s =
        mode === "all"
          ? clamp(Math.min((viewport.w - 32) / layout.width, (viewport.h - 32) / layout.height, 1), MIN_SCALE, 1)
          : clamp(Math.min((viewport.w - 32) / layout.width, 1), READABLE_SCALE, 1);
      const nx = (viewport.w - layout.width * s) / 2;
      const ny = layout.height * s <= viewport.h - LEGEND_ROOM ? Math.max(LEGEND_ROOM, (viewport.h - layout.height * s) / 2) : LEGEND_ROOM;
      setScaleState(s);
      if (instant) {
        scale.set(s);
        x.set(nx);
        y.set(ny);
      } else {
        animate(scale, s, spring);
        animate(x, nx, spring);
        animate(y, ny, spring);
      }
    },
    [viewport, layout.width, layout.height, scale, x, y],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setViewport({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitted = useRef(false);
  useEffect(() => {
    if (!viewport.w) return;
    const raf = requestAnimationFrame(() => {
      fit("width", !fitted.current);
      fitted.current = true;
      contentOpacity.set(1);
    });
    return () => cancelAnimationFrame(raf);
  }, [viewport.w, viewport.h, layout.width, layout.height, fit, contentOpacity]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        zoomTo(scale.get() * Math.exp(-e.deltaY * 0.01), { x: e.clientX - rect.left, y: e.clientY - rect.top }, true);
      } else {
        x.set(clamp(x.get() - e.deltaX, constraints.left, constraints.right));
        y.set(clamp(y.get() - e.deltaY, constraints.top, constraints.bottom));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomTo, constraints, scale, x, y]);

  const handleSelect = (id: number, e: MouseEvent) => {
    const d = downAt.current;
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    onSelect(id);
  };

  return (
    <div
      ref={viewportRef}
      className="relative h-[60vh] min-h-[400px] sm:h-[min(74vh,760px)] sm:min-h-[440px] cursor-grab touch-none overflow-hidden rounded-[1.125rem] bg-fill select-none active:cursor-grabbing"
      onPointerDownCapture={(e) => (downAt.current = { x: e.clientX, y: e.clientY })}
    >
      <motion.div
        drag
        dragMomentum
        dragElastic={0.14}
        dragConstraints={constraints}
        dragTransition={{ power: 0.35, timeConstant: 320, bounceStiffness: 300, bounceDamping: 40 }}
        style={{ x, y, scale, opacity: contentOpacity, width: layout.width, height: layout.height, transformOrigin: "0 0" }}
        className="absolute top-0 left-0"
      >
        <svg width={layout.width} height={layout.height} className="absolute inset-0 overflow-visible" aria-hidden>
          {layout.edges.map((edge) => {
            const onPath = path?.edges.has(edge.key) ?? false;
            const dim = path !== null && !onPath;
            const isTrue = edge.branch === "true";
            return (
              <motion.path
                key={edge.key}
                initial={false}
                animate={{ d: edge.d, opacity: dim ? 0.45 : 1 }}
                transition={spring}
                fill="none"
                stroke={isTrue ? "var(--accent)" : "var(--label-3)"}
                strokeWidth={onPath ? 2.75 : 1.5}
                strokeDasharray={isTrue ? undefined : "5 5"}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {layout.edges.map((edge) => {
          const onPath = path?.edges.has(edge.key) ?? false;
          const isTrue = edge.branch === "true";
          return (
            <motion.span
              key={`label-${edge.key}`}
              initial={false}
              animate={{ x: edge.mid.x, y: edge.mid.y, opacity: path && !onPath ? 0.5 : 1 }}
              transition={spring}
              className={`absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fill px-1.5 text-[0.6875rem] font-semibold ${
                isTrue ? "text-link" : "text-label-3"
              }`}
            >
              {isTrue ? "true" : "false"}
            </motion.span>
          );
        })}

        {layout.nodes.map((p) => {
          const node = kb.nodes[p.id];
          const step = path?.steps.get(p.id);
          const fired = path?.firedId === p.id;
          const selected = selectedId === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              initial={{ opacity: 0, scale: 0.92, x: p.x - NODE_W / 2, y: p.y }}
              animate={{ opacity: path && !step ? 0.55 : 1, scale: 1, x: p.x - NODE_W / 2, y: p.y }}
              transition={spring}
              onClick={(e) => handleSelect(p.id, e)}
              aria-pressed={selected}
              aria-label={`Rule ${node.id}: ${node.conclusion}`}
              className={`absolute top-0 left-0 flex flex-col rounded-xl bg-surface p-3.5 text-left transition-shadow ${
                fired ? "ring-2 ring-accent" : ""
              } ${selected ? "shadow-float" : "shadow-node"}`}
              style={{ width: NODE_W, height: p.h }}
            >
              {selected && <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-[1.25rem] ring-4 ring-accent-tint" />}
              <span className="flex h-[18px] items-center justify-between gap-2">
                <span className="type-caption font-semibold text-label-2">Rule {node.id}</span>
                {step && (
                  <span
                    className={`grid size-[18px] place-items-center rounded-full text-white ${
                      step.satisfied ? "bg-check" : "bg-label-3/60"
                    }`}
                    aria-label={step.satisfied ? "terpenuhi" : "tidak terpenuhi"}
                  >
                    {step.satisfied ? <Check size={11} strokeWidth={3.5} /> : <X size={10} strokeWidth={3.5} />}
                  </span>
                )}
              </span>
              <span className="mt-1.5 line-clamp-2 text-[0.9375rem] leading-5 font-semibold tracking-[-0.016em]">
                {node.conclusion}
              </span>
              <span className="mt-2.5 flex flex-col items-start gap-1">
                {node.conditions.length === 0 ? (
                  <span className="h-[22px] text-xs leading-[22px] text-label-2">t (selalu benar)</span>
                ) : (
                  node.conditions.map((c, i) => (
                    <span
                      key={i}
                      className="h-[22px] max-w-full truncate text-xs leading-[22px] tracking-[-0.01em] text-label-2"
                    >
                      {formatCondition(c)}
                    </span>
                  ))
                )}
              </span>
            </motion.button>
          );
        })}

        {layout.slot && (
          <motion.div
            key={`slot-${layout.slot.parent}-${layout.slot.branch}`}
            initial={{ opacity: 0, x: layout.slot.x - SLOT_W / 2, y: layout.slot.y }}
            animate={{ opacity: 1, x: layout.slot.x - SLOT_W / 2, y: layout.slot.y }}
            transition={spring}
            className="absolute top-0 left-0 grid place-items-center rounded-xl border-[1.5px] border-dashed border-accent/50 text-xs text-link"
            style={{ width: SLOT_W, height: SLOT_H }}
          >
            <span className="flex items-center gap-1">
              <Plus size={13} strokeWidth={2.5} />
              Rule baru di sini
            </span>
          </motion.div>
        )}
      </motion.div>

      <div className="pointer-events-none absolute top-3 left-4 text-[0.6875rem] leading-5 text-label-2">
        <p className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-accent" />
          <span>true · anak kanan</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-label-3" />
          <span>false · anak kiri</span>
        </p>
      </div>

      <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-full bg-surface p-1 text-label-2 shadow-node">
        <button
          type="button"
          aria-label="Perkecil"
          onClick={() => zoomTo(scale.get() / 1.25)}
          className="pressable grid size-8 place-items-center rounded-full hover:bg-fill hover:text-label"
        >
          <Minus size={15} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          aria-label="Ukuran asli"
          onClick={() => zoomTo(1)}
          className="pressable h-8 min-w-12 rounded-full px-1 text-xs font-semibold tabular-nums hover:bg-fill hover:text-label"
        >
          {Math.round(scaleState * 100)}%
        </button>
        <button
          type="button"
          aria-label="Perbesar"
          onClick={() => zoomTo(scale.get() * 1.25)}
          className="pressable grid size-8 place-items-center rounded-full hover:bg-fill hover:text-label"
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-separator" />
        <button
          type="button"
          aria-label="Lihat seluruh pohon"
          onClick={() => fit("all")}
          className="pressable grid size-8 place-items-center rounded-full hover:bg-fill hover:text-label"
        >
          <Maximize size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
