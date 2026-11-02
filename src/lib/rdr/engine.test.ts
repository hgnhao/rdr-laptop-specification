import { describe, expect, it } from "vitest";
import {
  addExceptionRule,
  createDefaultKB,
  DEFAULT_CONCLUSION,
  DEFAULT_CORNERSTONE,
  differenceList,
  evaluateCondition,
  infer,
  isDifferentiating,
  parseKB,
  RuleError,
  serializeKB,
  treeDepth,
} from "./engine";
import { createDemoKB, PERSONAS } from "./presets";
import type { Case, Condition, KnowledgeBase } from "./types";

const persona = (id: string) => PERSONAS.find((p) => p.id === id)!.case;
const gamer = persona("gamer");
const budgetGamer = persona("budget-gamer");
const editor = persona("editor");

const gamingRule: Condition[] = [
  { attribute: "primary_usage", operator: "==", value: "gaming" },
  { attribute: "gpu_required", operator: "==", value: "yes" },
];

function teach(kb: KnowledgeBase, c: Case, conclusion: string, conditions: Condition[]) {
  return addExceptionRule(kb, c, infer(kb, c), conclusion, conditions);
}

describe("knowledge base awal", () => {
  it("hanya berisi Rule 0 tanpa kondisi dengan kasus kunci sesuai spesifikasi", () => {
    const kb = createDefaultKB();
    expect(kb.nodes).toHaveLength(1);
    expect(kb.nodes[0].conditions).toEqual([]);
    expect(kb.nodes[0].conclusion).toBe(DEFAULT_CONCLUSION);
    expect(kb.nodes[0].cornerstone).toMatchObject({
      budget: 5_000_000,
      primary_usage: "office",
      weight_kg: 1.8,
      gpu_required: "no",
    });
  });

  it("memberi kesimpulan default untuk kasus apa pun", () => {
    const kb = createDefaultKB();
    for (const p of PERSONAS) {
      const r = infer(kb, p.case);
      expect(r.conclusion).toBe(DEFAULT_CONCLUSION);
      expect(r.firedId).toBe(0);
      expect(r.stop).toEqual({ nodeId: 0, branch: "true" });
    }
  });
});

describe("evaluasi kondisi", () => {
  it("menangani operator numerik", () => {
    const c = { ...DEFAULT_CORNERSTONE, budget: 10_000_000 };
    expect(evaluateCondition({ attribute: "budget", operator: ">", value: 10_000_000 }, c)).toBe(false);
    expect(evaluateCondition({ attribute: "budget", operator: ">=", value: 10_000_000 }, c)).toBe(true);
    expect(evaluateCondition({ attribute: "budget", operator: "<", value: 12_000_000 }, c)).toBe(true);
    expect(evaluateCondition({ attribute: "budget", operator: "<=", value: 9_000_000 }, c)).toBe(false);
  });

  it("menangani operator kategorikal", () => {
    expect(evaluateCondition({ attribute: "screen_type", operator: "==", value: "tn" }, DEFAULT_CORNERSTONE)).toBe(true);
    expect(evaluateCondition({ attribute: "screen_type", operator: "!=", value: "tn" }, DEFAULT_CORNERSTONE)).toBe(false);
  });
});

describe("difference list", () => {
  it("hanya memuat atribut yang berbeda, dan semua kandidat memisahkan kedua kasus", () => {
    const diffs = differenceList(gamer, DEFAULT_CORNERSTONE);
    expect(diffs.map((d) => d.attribute)).toEqual([
      "budget", "ram_gb", "weight_kg", "battery_hours", "primary_usage", "gpu_required", "screen_type",
    ]);
    for (const d of diffs) {
      expect(d.candidates.length).toBe(2);
      for (const cand of d.candidates) {
        expect(isDifferentiating(cand, gamer, DEFAULT_CORNERSTONE)).toBe(true);
      }
    }
  });

  it("memakai arah operator yang benar untuk atribut numerik", () => {
    const diffs = differenceList({ ...DEFAULT_CORNERSTONE, weight_kg: 1.2 }, DEFAULT_CORNERSTONE);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].candidates).toEqual([
      { attribute: "weight_kg", operator: "<", value: 1.8 },
      { attribute: "weight_kg", operator: "<=", value: 1.2 },
    ]);
  });

  it("kosong bila kasus identik dengan kasus kunci", () => {
    expect(differenceList(DEFAULT_CORNERSTONE, DEFAULT_CORNERSTONE)).toEqual([]);
  });
});

describe("akuisisi rule pengecualian", () => {
  it("menempel rule sebagai anak kanan bila penelusuran berhenti di node yang terpenuhi", () => {
    const { kb, node } = teach(createDefaultKB(), gamer, "Laptop Gaming Mid-Range", gamingRule);
    expect(kb.nodes[0].trueChild).toBe(node.id);
    expect(node.cornerstone).toEqual(gamer);
    expect(infer(kb, gamer).conclusion).toBe("Laptop Gaming Mid-Range");
    expect(infer(kb, DEFAULT_CORNERSTONE).conclusion).toBe(DEFAULT_CONCLUSION);
  });

  it("menempel rule sebagai anak kiri bila penelusuran berhenti di node yang tidak terpenuhi", () => {
    let kb = teach(createDefaultKB(), gamer, "Laptop Gaming Mid-Range", gamingRule).kb;
    const r = infer(kb, editor);
    expect(r.firedId).toBe(0);
    expect(r.stop).toEqual({ nodeId: 1, branch: "false" });

    const added = teach(kb, editor, "Laptop Creator OLED", [
      { attribute: "primary_usage", operator: "==", value: "video_editing" },
    ]);
    kb = added.kb;
    expect(kb.nodes[1].falseChild).toBe(added.node.id);
    expect(infer(kb, editor).conclusion).toBe("Laptop Creator OLED");
  });

  it("memakai kesimpulan terakhir yang terpenuhi, sehingga pengecualian menganulir induknya", () => {
    let kb = teach(createDefaultKB(), gamer, "Laptop Gaming Mid-Range", gamingRule).kb;
    kb = teach(kb, budgetGamer, "Laptop Gaming Entry-Level", [
      { attribute: "budget", operator: "<=", value: 12_000_000 },
    ]).kb;

    const r = infer(kb, budgetGamer);
    expect(r.steps.map((s) => [s.nodeId, s.satisfied])).toEqual([[0, true], [1, true], [2, true]]);
    expect(r.conclusion).toBe("Laptop Gaming Entry-Level");
    expect(infer(kb, gamer).conclusion).toBe("Laptop Gaming Mid-Range");
  });

  it("memakai kasus kunci rule pemberi kesimpulan, bukan kasus kunci Rule 0", () => {
    const kb = teach(createDefaultKB(), gamer, "Laptop Gaming Mid-Range", gamingRule).kb;
    const r = infer(kb, budgetGamer);
    expect(r.firedId).toBe(1);
    // budget <= 12 jt dipenuhi kasus kunci Rule 0 (5 jt) tapi tidak oleh kasus kunci Rule 1 (18 jt).
    const ok = addExceptionRule(kb, budgetGamer, r, "Entry", [
      { attribute: "budget", operator: "<=", value: 12_000_000 },
    ]);
    expect(ok.node.id).toBe(2);
    // primary_usage == gaming juga dipenuhi kasus kunci Rule 1, jadi ditolak.
    expect(() => addExceptionRule(kb, budgetGamer, r, "Entry", [gamingRule[0]])).toThrow(RuleError);
  });

  it("menolak kondisi yang tidak dipenuhi kasus baru", () => {
    const kb = createDefaultKB();
    expect(() => teach(kb, gamer, "X", [{ attribute: "primary_usage", operator: "==", value: "office" }]))
      .toThrow(/tidak dipenuhi kasus baru/);
  });

  it("menolak kondisi yang juga dipenuhi kasus kunci", () => {
    const kb = createDefaultKB();
    expect(() => teach(kb, gamer, "X", [{ attribute: "budget", operator: ">", value: 1_000_000 }]))
      .toThrow(/juga dipenuhi kasus kunci/);
  });

  it("menolak tanpa kondisi, kesimpulan kosong, atau kesimpulan yang sama", () => {
    const kb = createDefaultKB();
    expect(() => teach(kb, gamer, "X", [])).toThrow(/minimal satu kondisi/);
    expect(() => teach(kb, gamer, "  ", gamingRule)).toThrow(/wajib diisi/);
    expect(() => teach(kb, gamer, DEFAULT_CONCLUSION.toUpperCase(), gamingRule)).toThrow(/harus berbeda/);
  });

  it("menolak hasil penelusuran yang sudah usang", () => {
    const kb0 = createDefaultKB();
    const stale = infer(kb0, gamer);
    const kb1 = addExceptionRule(kb0, gamer, stale, "A", gamingRule).kb;
    expect(() => addExceptionRule(kb1, gamer, stale, "B", gamingRule)).toThrow(/sudah berubah/);
  });

  it("tidak mengubah KB lama (immutable)", () => {
    const kb = createDefaultKB();
    teach(kb, gamer, "Laptop Gaming Mid-Range", gamingRule);
    expect(kb.nodes).toHaveLength(1);
    expect(kb.nodes[0].trueChild).toBeNull();
  });
});

describe("KB contoh", () => {
  const kb = createDemoKB();

  it("memiliki struktur pengecualian dan alternatif yang diharapkan", () => {
    expect(kb.nodes).toHaveLength(6);
    expect(kb.nodes[0].trueChild).toBe(1);
    expect(kb.nodes[1].falseChild).toBe(2);
    expect(kb.nodes[2].falseChild).toBe(3);
    expect(kb.nodes[3].falseChild).toBe(4);
    expect(kb.nodes[1].trueChild).toBe(5);
    expect(treeDepth(kb)).toBe(5);
  });

  it("setiap kasus kunci tetap mendapat kesimpulan dari rule-nya sendiri", () => {
    for (const node of kb.nodes) {
      const r = infer(kb, node.cornerstone);
      expect(r.firedId).toBe(node.id);
      expect(r.conclusion).toBe(node.conclusion);
    }
  });
});

describe("serialisasi", () => {
  it("bolak-balik tanpa kehilangan data", () => {
    const kb = createDemoKB();
    expect(parseKB(serializeKB(kb))).toEqual(kb);
  });

  it("menolak file yang rusak", () => {
    const good = JSON.parse(serializeKB(createDemoKB()));
    const cases: [string, (d: typeof good) => void][] = [
      ["bukan JSON", () => {}],
      ["versi", (d) => { d.version = 2; }],
      ["Rule 0 berkondisi", (d) => { d.nodes[0].conditions = [gamingRule[0]]; }],
      ["atribut asing", (d) => { d.nodes[1].conditions[0].attribute = "cpu"; }],
      ["nilai kategori asing", (d) => { d.nodes[1].cornerstone.screen_type = "crt"; }],
      ["anak ganda", (d) => { d.nodes[2].trueChild = 3; }],
      ["anak ke akar", (d) => { d.nodes[5].trueChild = 0; }],
    ];
    for (const [label, mutate] of cases) {
      const d = structuredClone(good);
      mutate(d);
      const text = label === "bukan JSON" ? "{oops" : JSON.stringify(d);
      expect(() => parseKB(text), label).toThrow(RuleError);
    }
  });

  it("menolak siklus yang terputus dari Rule 0", () => {
    const d = JSON.parse(serializeKB(createDemoKB()));
    d.nodes[0].trueChild = null;
    d.nodes[1].falseChild = null;
    d.nodes[4].falseChild = 1; // 1 -> 5 ... dan 2 -> 3 -> 4 -> 1 terlepas dari akar
    d.nodes[1].falseChild = 2;
    expect(() => parseKB(JSON.stringify(d))).toThrow(/tidak terhubung/);
  });
});
