"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { springFast } from "@/lib/motion";
import { attributeLabel, formatCondition, formatValue, isNumeric, NUMERIC_ATTRIBUTES, OPERATOR_SYMBOL } from "@/lib/rdr/attributes";
import { addExceptionRule, differenceList, isDifferentiating, RuleError, uniqueConclusions } from "@/lib/rdr/engine";
import { CONCLUSION_SUGGESTIONS } from "@/lib/rdr/presets";
import type { Case, Condition, Difference, InferenceResult, KnowledgeBase, RuleNode } from "@/lib/rdr/types";

interface Props {
  open: boolean;
  onClose: () => void;
  kb: KnowledgeBase;
  caseValue: Case;
  result: InferenceResult;
  onSaved: (kb: KnowledgeBase, node: RuleNode) => void;
}

interface Pick {
  enabled: boolean;
  candidate: number;
  threshold: string;
}

function displayThreshold(c: Condition): string {
  return isNumeric(c.attribute) ? String(NUMERIC_ATTRIBUTES[c.attribute].toDisplay(c.value as number)) : "";
}

function buildCondition(d: Difference, p: Pick): Condition | null {
  const base = d.candidates[p.candidate];
  if (!isNumeric(base.attribute)) return base;
  const n = Number(p.threshold.replace(",", "."));
  if (p.threshold.trim() === "" || !Number.isFinite(n)) return null;
  return { ...base, value: NUMERIC_ATTRIBUTES[base.attribute].fromDisplay(n) } as Condition;
}

function SelectCircle({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-[22px] shrink-0 place-items-center rounded-full transition-colors ${
        checked ? "bg-accent text-white" : "shadow-[inset_0_0_0_1.5px_var(--line-strong)]"
      }`}
    >
      {checked && <Check size={13} strokeWidth={3.5} />}
    </span>
  );
}

export function RuleSheet(props: Props) {
  const { open, onClose, onSaved } = props;
  // Dibekukan saat sheet dibuka agar isinya tidak berubah selama animasi tutup.
  const [{ kb, caseValue, result }] = useState(() => ({ kb: props.kb, caseValue: props.caseValue, result: props.result }));
  const firedId = result.firedId;
  const cornerstone = kb.nodes[firedId].cornerstone;
  const diffs = useMemo(() => differenceList(caseValue, cornerstone), [caseValue, cornerstone]);

  const [conclusion, setConclusion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, Pick>>(() =>
    Object.fromEntries(
      diffs.map((d) => [d.attribute, { enabled: false, candidate: 0, threshold: displayThreshold(d.candidates[0]) }]),
    ),
  );

  const update = (attr: string, patch: Partial<Pick>) => {
    setError(null);
    setPicks((p) => ({ ...p, [attr]: { ...p[attr], ...patch } }));
  };

  const chosen = diffs
    .filter((d) => picks[d.attribute]?.enabled)
    .map((d) => ({ d, cond: buildCondition(d, picks[d.attribute]) }));
  const validConditions = chosen
    .map((x) => x.cond)
    .filter((c): c is Condition => c !== null && isDifferentiating(c, caseValue, cornerstone));
  const hasInvalid = validConditions.length !== chosen.length;
  const trimmed = conclusion.trim();
  const sameConclusion = trimmed.toLowerCase() === result.conclusion.trim().toLowerCase();

  const blocker =
    diffs.length === 0
      ? "Tidak ada kondisi pembeda"
      : !trimmed
        ? "Isi kesimpulan"
        : sameConclusion
          ? "Kesimpulan masih sama"
          : chosen.length === 0
            ? "Pilih kondisi"
            : hasInvalid
              ? "Batas belum valid"
              : null;

  const suggestions = [...new Set([...uniqueConclusions(kb), ...CONCLUSION_SUGGESTIONS])]
    .filter((s) => s.toLowerCase() !== result.conclusion.toLowerCase())
    .slice(0, 6);

  const side = result.stop.branch === "true" ? "anak kanan" : "anak kiri";

  const save = () => {
    try {
      const { kb: next, node } = addExceptionRule(kb, caseValue, result, trimmed, validConditions);
      onSaved(next, node);
    } catch (e) {
      setError(e instanceof RuleError ? e.message : "Gagal menyimpan rule.");
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rule baru"
      subtitle={
        <>
          Pengecualian untuk {result.conclusion} (Rule {firedId}).
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className={`type-small min-w-0 ${error ? "text-red" : "text-label-3"}`} role={error ? "alert" : undefined}>
            {error ?? blocker}
          </p>
          <div className="flex shrink-0 items-center gap-5">
            <Button variant="link" onClick={onClose}>
              Batal
            </Button>
            <Button variant="primary" onClick={save} disabled={blocker !== null}>
              Simpan
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-9">
        <section>
          <label className="block rounded-xl px-4 pt-2.5 pb-2 shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_2px_var(--accent)]">
            <span className="type-caption block text-label-2">Kesimpulan yang benar</span>
            <input
              value={conclusion}
              onChange={(e) => {
                setError(null);
                setConclusion(e.target.value);
              }}
              placeholder="Laptop Gaming Mid-Range"
              autoComplete="off"
              className="w-full bg-transparent text-[1.0625rem] outline-none placeholder:text-label-3"
            />
          </label>
          <p className="type-small mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setConclusion(s)} className="text-link hover:underline">
                {s}
              </button>
            ))}
          </p>
        </section>

        <section>
          <h3 className="type-section">
            Kondisi. <span className="text-label-3">Apa yang membedakan kasus ini?</span>
          </h3>
          <p className="type-small mt-1 text-label-2">
            Dipenuhi kasus ini, tidak dipenuhi kasus kunci Rule {firedId}.
          </p>

          {diffs.length === 0 ? (
            <p className="type-small mt-4 rounded-xl bg-fill p-4">
              Kasus ini sama persis dengan kasus kunci Rule {firedId}, jadi tidak bisa dibuat rule.
            </p>
          ) : (
            <div className="mt-4 border-t border-separator">
              <div className="type-caption grid grid-cols-[1fr_5rem_5rem] gap-3 py-2 text-label-3 sm:grid-cols-[1fr_6.5rem_6.5rem]">
                <span />
                <span className="text-right">Kasus ini</span>
                <span className="text-right">Rule {firedId}</span>
              </div>
              {diffs.map((d) => {
                const p = picks[d.attribute];
                const cond = buildCondition(d, p);
                const valid = cond !== null && isDifferentiating(cond, caseValue, cornerstone);
                const numeric = isNumeric(d.attribute);
                return (
                  <div key={d.attribute} className="border-t border-separator">
                    <button
                      type="button"
                      aria-pressed={p.enabled}
                      onClick={() => update(d.attribute, { enabled: !p.enabled })}
                      className="grid w-full grid-cols-[1fr_5rem_5rem] items-center gap-3 py-3.5 text-left sm:grid-cols-[1fr_6.5rem_6.5rem]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <SelectCircle checked={p.enabled} />
                        <span className="truncate">{attributeLabel(d.attribute)}</span>
                      </span>
                      <span className="text-right font-semibold tabular-nums">{formatValue(d.attribute, d.newValue)}</span>
                      <span className="text-right text-label-2 tabular-nums">{formatValue(d.attribute, d.cornerstoneValue)}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {p.enabled && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={springFast}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-4 pl-[2.125rem]">
                            <Segmented
                              id={`cand-${d.attribute}`}
                              ariaLabel={`Kondisi ${attributeLabel(d.attribute)}`}
                              size="sm"
                              value={p.candidate}
                              onChange={(i) => update(d.attribute, { candidate: i, threshold: displayThreshold(d.candidates[i]) })}
                              options={d.candidates.map((c, i) => ({
                                value: i,
                                label: `${OPERATOR_SYMBOL[c.operator]} ${formatValue(c.attribute, c.value)}`,
                              }))}
                            />
                            {numeric && (
                              <label className="type-small flex h-8 items-center rounded-lg pr-3 text-label-2 shadow-[inset_0_0_0_1px_var(--line-strong)] focus-within:shadow-[inset_0_0_0_2px_var(--accent)]">
                                <input
                                  inputMode="decimal"
                                  value={p.threshold}
                                  onChange={(e) => update(d.attribute, { threshold: e.target.value })}
                                  className="h-full w-14 bg-transparent px-3 text-right text-label tabular-nums outline-none"
                                  aria-label={`Nilai batas ${attributeLabel(d.attribute)}`}
                                />
                                {NUMERIC_ATTRIBUTES[d.attribute as keyof typeof NUMERIC_ATTRIBUTES].displayUnit}
                              </label>
                            )}
                            {numeric && !valid && <span className="type-caption text-red">Batas tidak memisahkan kedua kasus</span>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-fill p-5">
          <p className="type-small flex flex-wrap items-center gap-x-1.5 gap-y-1 leading-6">
            <span className="font-semibold text-label-3">JIKA</span>
            {validConditions.length === 0 ? (
              <span className="text-label-3">…</span>
            ) : (
              validConditions.map((c, i) => (
                <span key={c.attribute} className="flex items-center gap-1.5">
                  {i > 0 && <span className="font-semibold text-label-3">DAN</span>}
                  <span className="font-semibold">{formatCondition(c)}</span>
                </span>
              ))
            )}
            <span className="font-semibold text-label-3">MAKA</span>
            <span className={`font-semibold ${trimmed ? "text-link" : "text-label-3"}`}>{trimmed || "…"}</span>
          </p>
          <p className="type-caption mt-2 text-label-2">
            Dipasang sebagai {side} Rule {result.stop.nodeId}.
          </p>
        </section>
      </div>
    </Sheet>
  );
}
