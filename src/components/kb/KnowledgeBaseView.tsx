"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createDefaultKB, parseKB, RuleError, serializeKB, treeDepth } from "@/lib/rdr/engine";
import { createDemoKB } from "@/lib/rdr/presets";
import type { InferenceResult, KnowledgeBase } from "@/lib/rdr/types";
import { setState } from "@/lib/store";
import { NodeDetail } from "./NodeDetail";
import { TreeCanvas } from "./TreeCanvas";

interface Props {
  kb: KnowledgeBase;
  trace: InferenceResult;
  selectedId: number;
  onSelect: (id: number) => void;
  onGoConsult: () => void;
}

export function KnowledgeBaseView({ kb, trace, selectedId, onSelect, onGoConsult }: Props) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showTrace, setShowTrace] = useState(true);

  const replaceKB = (next: KnowledgeBase, message: string) => {
    const prev = setState((s) => ({ ...s, kb: next }));
    onSelect(0);
    toast({ message, action: { label: "Urungkan", onClick: () => setState(() => prev) } });
  };

  const exportKB = () => {
    const blob = new Blob([serializeKB(kb)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rdr-knowledge-base-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ message: "KB diekspor", tone: "success" });
  };

  const importKB = async (file: File) => {
    try {
      const next = parseKB(await file.text());
      replaceKB(next, `Diimpor: ${next.nodes.length} rule`);
    } catch (e) {
      toast({ message: e instanceof RuleError ? e.message : "Gagal membaca file." });
    }
  };

  const node = kb.nodes[selectedId] ? selectedId : 0;

  return (
    <div>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-hero">Knowledge Base</h1>
          <p className="mt-2 text-label-2">
            {kb.nodes.length} rule · kedalaman {treeDepth(kb)}
          </p>
        </div>
        <div className="type-small flex flex-wrap items-center gap-x-5 gap-y-2 pb-1">
          <Button variant="link" size="sm" onClick={() => replaceKB(createDemoKB(), "KB contoh dimuat")}>
            Muat contoh
          </Button>
          <Button variant="link" size="sm" onClick={() => fileRef.current?.click()}>
            Impor
          </Button>
          <Button variant="link" size="sm" onClick={exportKB}>
            Ekspor
          </Button>
          <Button variant="destructive" size="sm" onClick={() => replaceKB(createDefaultKB(), "KB direset ke Rule 0")}>
            Reset
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importKB(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        {kb.nodes.length === 1 ? (
          <p className="type-small text-label-2">
            Baru ada Rule 0. Tambah rule lewat{" "}
            <button type="button" onClick={onGoConsult} className="text-link hover:underline">
              Konsultasi
            </button>{" "}
            › Tidak, buat rule.
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          role="switch"
          aria-checked={showTrace}
          onClick={() => setShowTrace((v) => !v)}
          className="type-small flex items-center gap-2.5 text-label-2"
        >
          Sorot jalur kasus
          <span className={`relative h-[31px] w-[51px] rounded-full transition-colors duration-200 ${showTrace ? "bg-check" : "bg-fill-2"}`}>
            <span
              className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] transition-transform duration-200 ${
                showTrace ? "translate-x-5" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <TreeCanvas kb={kb} trace={showTrace ? trace : null} selectedId={node} onSelect={onSelect} />
        <NodeDetail kb={kb} nodeId={node} trace={showTrace ? trace : null} onSelect={onSelect} />
      </div>
    </div>
  );
}
