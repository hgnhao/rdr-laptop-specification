"use client";

import { AnimatePresence, motion } from "motion/react";
import { springFast } from "@/lib/motion";
import { ATTRIBUTE_ORDER, attributeLabel, formatCondition, formatValue } from "@/lib/rdr/attributes";
import { parentOf } from "@/lib/rdr/engine";
import type { InferenceResult, KnowledgeBase } from "@/lib/rdr/types";

interface Props {
  kb: KnowledgeBase;
  nodeId: number;
  trace: InferenceResult | null;
  onSelect: (id: number) => void;
}

function ChildLink({ label, id, onSelect }: { label: string; id: number | null; onSelect: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-label-2">{label}</span>
      {id === null ? (
        <span className="text-label-3">kosong</span>
      ) : (
        <button type="button" onClick={() => onSelect(id)} className="text-link hover:underline">
          Rule {id}
        </button>
      )}
    </div>
  );
}

export function NodeDetail({ kb, nodeId, trace, onSelect }: Props) {
  const node = kb.nodes[nodeId];
  const parent = parentOf(kb, nodeId);
  const step = trace?.steps.find((s) => s.nodeId === nodeId);
  const status = !trace
    ? null
    : !step
      ? { text: "Tidak dilewati", cls: "text-label-3" }
      : trace.firedId === nodeId
        ? { text: "Kesimpulan kasus ini", cls: "text-link" }
        : step.satisfied
          ? { text: "Terpenuhi, bukan yang terakhir", cls: "text-green" }
          : { text: "Tidak terpenuhi", cls: "text-label-2" };

  return (
    <aside className="overflow-hidden rounded-[1.125rem] bg-fill" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={nodeId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={springFast}>
          <div className="p-6">
            <p className="type-caption text-label-2">
              Rule {node.id}
              {" · "}
              {parent ? `${parent.branch === "true" ? "anak kanan" : "anak kiri"} Rule ${parent.parent.id}` : "akar"}
            </p>
            <h2 className="mt-1 text-[1.3125rem] leading-tight font-semibold text-balance">{node.conclusion}</h2>
            {status && <p className={`type-small mt-2 font-semibold ${status.cls}`}>{status.text}</p>}
          </div>

          <div className="type-small mx-6 border-t border-separator py-4">
            <h3 className="mb-1.5 font-semibold">Kondisi</h3>
            {node.conditions.length === 0 ? (
              <p>
                t <span className="text-label-2">(selalu benar)</span>
              </p>
            ) : (
              <ul className="space-y-1">
                {node.conditions.map((c, i) => (
                  <li key={i}>
                    {i > 0 && <span className="mr-1.5 text-xs font-semibold text-label-3">DAN</span>}
                    {formatCondition(c)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="type-small mx-6 border-t border-separator py-4">
            <h3 className="mb-1 font-semibold">Kasus kunci</h3>
            <dl>
              {ATTRIBUTE_ORDER.map((attr) => (
                <div key={attr} className="flex items-center justify-between gap-3 py-1">
                  <dt className="text-label-2">{attributeLabel(attr)}</dt>
                  <dd className="tabular-nums">{formatValue(attr, node.cornerstone[attr])}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="type-small mx-6 border-t border-separator py-2">
            <ChildLink label="Anak kanan" id={node.trueChild} onSelect={onSelect} />
            <ChildLink label="Anak kiri" id={node.falseChild} onSelect={onSelect} />
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
