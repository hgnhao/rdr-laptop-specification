"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CaseForm } from "@/components/consult/CaseForm";
import { ResultPanel, type Phase } from "@/components/consult/ResultPanel";
import { RuleSheet } from "@/components/consult/RuleSheet";
import { HistoryView } from "@/components/history/HistoryView";
import { KnowledgeBaseView } from "@/components/kb/KnowledgeBaseView";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { spring, springFast } from "@/lib/motion";
import { DEFAULT_CORNERSTONE, infer } from "@/lib/rdr/engine";
import type { Case, KnowledgeBase, RuleNode } from "@/lib/rdr/types";
import { newId, setState, useAppState } from "@/lib/store";

type View = "consult" | "kb" | "history";
const VIEWS: View[] = ["consult", "kb", "history"];
const NAV: { value: View; label: string; short?: string }[] = [
  { value: "consult", label: "Konsultasi" },
  { value: "kb", label: "Knowledge Base", short: "KB" },
  { value: "history", label: "Riwayat" },
];

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function useHashView(): [View, (v: View) => void] {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const view = (VIEWS as string[]).includes(hash) ? (hash as View) : "consult";
  const setView = useCallback((v: View) => {
    window.history.replaceState(null, "", v === "consult" ? window.location.pathname : `#${v}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  return [view, setView];
}

const noopSubscribe = () => () => {};

function Shell() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const { kb, history } = useAppState();
  const toast = useToast();
  const [view, setView] = useHashView();
  const [caseValue, setCaseValue] = useState<Case>({ ...DEFAULT_CORNERSTONE });
  const [phase, setPhase] = useState<Phase>({ kind: "review" });
  const [sheet, setSheet] = useState({ open: false, key: 0 });
  const [selectedId, setSelectedId] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const result = useMemo(() => infer(kb, caseValue), [kb, caseValue]);

  const changeCase = (c: Case) => {
    setCaseValue(c);
    setPhase({ kind: "review" });
  };

  const changeView = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const agree = () => {
    setState((s) => ({
      ...s,
      history: [
        { id: newId(), at: new Date().toISOString(), case: caseValue, conclusion: result.conclusion, firedId: result.firedId, verdict: "agree" },
        ...s.history,
      ],
    }));
    setPhase({ kind: "agreed" });
  };

  const saved = (next: KnowledgeBase, node: RuleNode) => {
    const entry = {
      id: newId(),
      at: new Date().toISOString(),
      case: caseValue,
      conclusion: result.conclusion,
      firedId: result.firedId,
      verdict: "corrected" as const,
      newRuleId: node.id,
      newConclusion: node.conclusion,
    };
    const prev = setState((s) => ({ kb: next, history: [entry, ...s.history] }));
    setSheet((s) => ({ ...s, open: false }));
    setPhase({ kind: "learned", ruleId: node.id });
    setSelectedId(node.id);
    toast({
      message: `Rule ${node.id} ditambahkan`,
      tone: "success",
      action: {
        label: "Urungkan",
        onClick: () => {
          setState(() => prev);
          setPhase({ kind: "review" });
          setSelectedId(0);
        },
      },
    });
  };

  const nextConsumer = () => {
    changeCase({ ...DEFAULT_CORNERSTONE });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [resultVisible, setResultVisible] = useState(true);
  useEffect(() => {
    const el = resultRef.current;
    if (!el || view !== "consult") return;
    const io = new IntersectionObserver(([e]) => setResultVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [view]);

  return (
    <>
      <nav className="material sticky top-0 z-40 border-b border-separator">
        <div className="mx-auto flex h-[52px] max-w-[1080px] items-center justify-between gap-4 px-[22px]">
          <button
            type="button"
            onClick={() => changeView("consult")}
            aria-label="Laptop Advisor"
            className="flex shrink-0 items-center gap-2 text-[1.3125rem] font-semibold tracking-[0.011em]"
          >
            <Logo className="size-6" />
            <span className="hidden min-[420px]:inline">Laptop Advisor</span>
          </button>
          <div className="flex items-center gap-5 sm:gap-7">
            {NAV.map((n) => {
              const active = view === n.value;
              return (
                <button
                  key={n.value}
                  type="button"
                  onClick={() => changeView(n.value)}
                  aria-current={active ? "page" : undefined}
                  className={`type-caption ${active ? "cursor-default text-label-3" : "text-label hover:text-link"}`}
                >
                  {n.short ? (
                    <>
                      <span className="sm:hidden">{n.short}</span>
                      <span className="hidden sm:inline">{n.label}</span>
                    </>
                  ) : (
                    n.label
                  )}
                </button>
              );
            })}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-[22px] pt-10 pb-24 sm:pt-14">
        {/* Dipasang ulang saat hidrasi agar halaman dari hash langsung tampil tanpa transisi. */}
        <AnimatePresence key={hydrated ? "client" : "server"} mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={springFast}
          >
            {view === "consult" && (
              <>
                <h1 className="type-hero">Rekomendasi laptop</h1>
                <div className="mt-10 grid grid-cols-[minmax(0,1fr)] items-start gap-14 lg:mt-12 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-16">
                  <div ref={resultRef} className="order-last lg:sticky lg:top-[76px] lg:order-first">
                    <ResultPanel
                      kb={kb}
                      result={result}
                      phase={phase}
                      onAgree={agree}
                      onDisagree={() => setSheet((s) => ({ open: true, key: s.key + 1 }))}
                      onNext={nextConsumer}
                      onShowTree={() => {
                        setSelectedId(result.firedId);
                        changeView("kb");
                      }}
                    />
                  </div>
                  <CaseForm value={caseValue} onChange={changeCase} />
                </div>
              </>
            )}
            {view === "kb" && (
              <KnowledgeBaseView
                kb={kb}
                trace={result}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onGoConsult={() => changeView("consult")}
              />
            )}
            {view === "history" && (
              <HistoryView
                history={history}
                onLoadCase={(c) => {
                  changeCase({ ...c });
                  changeView("consult");
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-fill">
        <p className="type-caption mx-auto max-w-[1080px] px-[22px] py-5 text-label-2">
          Laptop Advisor · Sistem pakar Ripple Down Rules
        </p>
      </footer>

      <AnimatePresence>
        {view === "consult" && !resultVisible && (
          <motion.button
            type="button"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={spring}
            onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="material pressable fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-[1.125rem] py-3 pr-3 pl-5 text-left shadow-float lg:hidden"
          >
            <span className="min-w-0">
              <span className="type-caption block font-semibold text-orange">Rekomendasi</span>
              <span className="block truncate font-semibold">{result.conclusion}</span>
            </span>
            <span className="type-small shrink-0 rounded-full bg-accent px-4 py-1.5 text-on-accent">Nilai</span>
          </motion.button>
        )}
      </AnimatePresence>

      <RuleSheet
        key={sheet.key}
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        kb={kb}
        caseValue={caseValue}
        result={result}
        onSaved={saved}
      />
    </>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </MotionConfig>
  );
}
