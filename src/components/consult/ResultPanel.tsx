"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { spring, springFast } from "@/lib/motion";
import { formatCondition } from "@/lib/rdr/attributes";
import type { InferenceResult, InferenceStep, KnowledgeBase } from "@/lib/rdr/types";

export type Phase = { kind: "review" } | { kind: "agreed" } | { kind: "learned"; ruleId: number };

interface Props {
  kb: KnowledgeBase;
  result: InferenceResult;
  phase: Phase;
  onAgree: () => void;
  onDisagree: () => void;
  onNext: () => void;
  onShowTree: () => void;
}

function StepRow({ step, kb, fired }: { step: InferenceStep; kb: KnowledgeBase; fired: boolean }) {
  const node = kb.nodes[step.nodeId];
  const overridden = step.satisfied && !fired;

  return (
    <li className="flex gap-3 py-3.5">
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white ${step.satisfied ? "bg-check" : "bg-label-3/60"}`}
        aria-label={step.satisfied ? "Terpenuhi" : "Tidak terpenuhi"}
      >
        {step.satisfied ? <Check size={12} strokeWidth={3.5} /> : <X size={11} strokeWidth={3.5} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="type-small">
          <span className="font-semibold">Rule {node.id}</span>
          <span className="text-label-3"> · </span>
          <span className={overridden ? "text-label-3 line-through" : step.satisfied ? "" : "text-label-2"}>
            {node.conclusion}
          </span>
        </p>
        <p className="type-caption mt-1 text-label-2">
          {step.checks.length === 0
            ? "t (selalu benar)"
            : step.checks.map((ch, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-label-3"> · </span>}
                  <span className={ch.passed ? "" : "text-red"}>{formatCondition(ch.condition)}</span>
                </span>
              ))}
        </p>
        <p className="type-caption mt-0.5 text-label-3">
          {step.satisfied ? "Anak kanan" : "Anak kiri"}: {step.next !== null ? `Rule ${step.next}` : "kosong, berhenti"}
        </p>
      </div>
    </li>
  );
}

export function ResultPanel({ kb, result, phase, onAgree, onDisagree, onNext, onShowTree }: Props) {
  const fired = kb.nodes[result.firedId];

  return (
    <section className="rounded-[1.125rem] bg-fill p-6 sm:p-8" aria-labelledby="result-title">
      <p className="type-small font-semibold text-orange">Rekomendasi</p>
      <div className="relative mt-1">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.h2
            id="result-title"
            key={fired.conclusion}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={spring}
            className="type-title text-balance"
          >
            {fired.conclusion}
          </motion.h2>
        </AnimatePresence>
      </div>
      <button type="button" onClick={onShowTree} className="type-small mt-2 inline-flex items-center text-link hover:underline">
        Rule {fired.id} di Knowledge Base
        <ChevronRight size={14} strokeWidth={2.25} />
      </button>

      <div className="mt-6 border-t border-separator pt-4">
        <h3 className="type-small font-semibold">Penelusuran</h3>
        <ol className="divide-y divide-separator">
          {result.steps.map((step, i) => (
            <StepRow key={`${step.nodeId}-${i}`} step={step} kb={kb} fired={step.nodeId === result.firedId} />
          ))}
        </ol>
      </div>

      <div className="mt-4 border-t border-separator pt-6">
        <AnimatePresence mode="wait" initial={false}>
          {phase.kind === "review" ? (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={springFast}>
              <p className="type-small mb-3 text-label-2">Apakah pakar setuju?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="primary" onClick={onAgree}>
                  Setuju
                </Button>
                <Button variant="outline" onClick={onDisagree}>
                  Tidak, buat rule
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key={phase.kind} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={springFast}>
              <p className="type-small mb-3 flex items-center gap-2 font-semibold">
                <span className={`grid size-5 place-items-center rounded-full text-white ${phase.kind === "agreed" ? "bg-check" : "bg-accent"}`}>
                  <Check size={12} strokeWidth={3.5} />
                </span>
                {phase.kind === "agreed" ? "Disetujui pakar" : `Rule ${phase.ruleId} ditambahkan`}
              </p>
              <Button variant="outline" onClick={onNext} className="w-full">
                Konsumen berikutnya
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
