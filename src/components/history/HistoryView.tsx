"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { summarizeCase } from "@/lib/rdr/attributes";
import type { Case } from "@/lib/rdr/types";
import { setState, type Consultation } from "@/lib/store";

interface Props {
  history: Consultation[];
  onLoadCase: (c: Case) => void;
}

const timeFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

export function HistoryView({ history, onLoadCase }: Props) {
  const toast = useToast();

  const clear = () => {
    const prev = setState((s) => ({ ...s, history: [] }));
    toast({ message: "Riwayat dihapus", action: { label: "Urungkan", onClick: () => setState(() => prev) } });
  };

  return (
    <div className="max-w-3xl">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="type-hero">Riwayat</h1>
          {history.length > 0 && <p className="mt-2 text-label-2">{history.length} kasus</p>}
        </div>
        {history.length > 0 && (
          <Button size="sm" variant="destructive" onClick={clear}>
            Hapus riwayat
          </Button>
        )}
      </header>

      {history.length === 0 ? (
        <p className="mt-12 text-label-2">Belum ada konsultasi.</p>
      ) : (
        <ol className="mt-10 divide-y divide-separator border-t border-separator">
          {history.map((h) => (
            <li key={h.id} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p>
                  {h.verdict === "agree" ? (
                    <span className="font-semibold">{h.conclusion}</span>
                  ) : (
                    <>
                      <span className="text-label-3 line-through">{h.conclusion}</span>
                      <ArrowRight size={14} className="mx-1.5 inline align-[-2px] text-label-3" />
                      <span className="font-semibold">{h.newConclusion}</span>
                    </>
                  )}
                </p>
                <p className="type-small mt-1 text-label-2">
                  <span className={h.verdict === "agree" ? "text-green" : "text-link"}>
                    {h.verdict === "agree" ? "Disetujui" : `Rule ${h.newRuleId} dibuat`}
                  </span>
                  {" · "}
                  {timeFormat.format(new Date(h.at))}
                </p>
                <p className="type-caption mt-1 text-label-3">{summarizeCase(h.case).join(" · ")}</p>
              </div>
              <Button size="sm" variant="link" onClick={() => onLoadCase(h.case)} className="self-start">
                Muat kasus <ChevronRight size={14} strokeWidth={2.25} />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
