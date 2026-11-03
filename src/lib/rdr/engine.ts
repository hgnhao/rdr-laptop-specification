import {
  ATTRIBUTE_ORDER,
  CATEGORICAL_ATTRIBUTES,
  formatCondition,
  isNumeric,
} from "./attributes";
import type {
  Case,
  Condition,
  Difference,
  InferenceResult,
  InferenceStep,
  KnowledgeBase,
  RuleNode,
} from "./types";

export const DEFAULT_CONCLUSION = "Laptop Daily Office Entry-Level";

export const DEFAULT_CORNERSTONE: Case = {
  budget: 5_000_000,
  ram_gb: 8,
  weight_kg: 1.8,
  battery_hours: 6,
  primary_usage: "office",
  gpu_required: "no",
  screen_type: "tn",
};

export class RuleError extends Error {}

export function createDefaultKB(now = new Date().toISOString()): KnowledgeBase {
  return {
    version: 1,
    nodes: [
      {
        id: 0,
        conditions: [],
        conclusion: DEFAULT_CONCLUSION,
        cornerstone: { ...DEFAULT_CORNERSTONE },
        trueChild: null,
        falseChild: null,
        createdAt: now,
      },
    ],
  };
}

export function evaluateCondition(cond: Condition, c: Case): boolean {
  if (cond.attribute === "budget" || cond.attribute === "ram_gb" ||
      cond.attribute === "weight_kg" || cond.attribute === "battery_hours") {
    const v = c[cond.attribute];
    switch (cond.operator) {
      case ">": return v > cond.value;
      case ">=": return v >= cond.value;
      case "<": return v < cond.value;
      case "<=": return v <= cond.value;
    }
  }
  const v = c[cond.attribute];
  return cond.operator === "==" ? v === cond.value : v !== cond.value;
}

/**
 * Menelusuri pohon dari Rule 0. Bila kondisi node terpenuhi, kesimpulannya
 * menggantikan kesimpulan sebelumnya lalu penelusuran lanjut ke anak kanan;
 * bila tidak, lanjut ke anak kiri. Berhenti saat bertemu slot kosong.
 */
export function infer(kb: KnowledgeBase, c: Case): InferenceResult {
  const steps: InferenceStep[] = [];
  let firedId = 0;
  let id: number | null = 0;
  let stop: InferenceResult["stop"] = { nodeId: 0, branch: "true" };

  while (id !== null) {
    if (steps.length > kb.nodes.length) throw new RuleError("Pohon RDR mengandung siklus.");
    const node: RuleNode = kb.nodes[id];
    const checks = node.conditions.map((condition) => ({
      condition,
      passed: evaluateCondition(condition, c),
    }));
    const satisfied = checks.every((ch) => ch.passed);
    const next = satisfied ? node.trueChild : node.falseChild;
    if (satisfied) firedId = id;
    steps.push({ nodeId: id, checks, satisfied, next });
    stop = { nodeId: id, branch: satisfied ? "true" : "false" };
    id = next;
  }

  return { conclusion: kb.nodes[firedId].conclusion, firedId, steps, stop };
}

/** Benar bila kondisi dipenuhi kasus baru dan tidak dipenuhi kasus kunci. */
export function isDifferentiating(cond: Condition, newCase: Case, cornerstone: Case): boolean {
  return evaluateCondition(cond, newCase) && !evaluateCondition(cond, cornerstone);
}

/**
 * Difference list: untuk tiap atribut yang nilainya berbeda dari kasus kunci,
 * kandidat kondisi yang memisahkan kasus baru dari kasus kunci.
 */
export function differenceList(newCase: Case, cornerstone: Case): Difference[] {
  const diffs: Difference[] = [];
  for (const attr of ATTRIBUTE_ORDER) {
    const nv = newCase[attr];
    const cv = cornerstone[attr];
    if (nv === cv) continue;

    let candidates: Condition[];
    if (attr === "budget" || attr === "ram_gb" || attr === "weight_kg" || attr === "battery_hours") {
      const n = nv as number;
      const k = cv as number;
      candidates = n > k
        ? [{ attribute: attr, operator: ">", value: k }, { attribute: attr, operator: ">=", value: n }]
        : [{ attribute: attr, operator: "<", value: k }, { attribute: attr, operator: "<=", value: n }];
    } else {
      candidates = [
        { attribute: attr, operator: "==", value: nv as string },
        { attribute: attr, operator: "!=", value: cv as string },
      ];
    }
    diffs.push({
      attribute: attr,
      newValue: nv,
      cornerstoneValue: cv,
      candidates: candidates.filter((cand) => isDifferentiating(cand, newCase, cornerstone)),
    });
  }
  return diffs;
}

/**
 * Menambahkan rule pengecualian untuk kesimpulan `result` yang ditolak pakar.
 * Rule baru ditempel di slot kosong tempat penelusuran berhenti: anak kanan
 * bila node terakhir terpenuhi, anak kiri bila tidak. Kasus baru menjadi
 * kasus kunci rule tersebut.
 */
export function addExceptionRule(
  kb: KnowledgeBase,
  newCase: Case,
  result: InferenceResult,
  conclusion: string,
  conditions: Condition[],
  now = new Date().toISOString(),
): { kb: KnowledgeBase; node: RuleNode } {
  const trimmed = conclusion.trim();
  if (!trimmed) throw new RuleError("Kesimpulan baru wajib diisi.");
  if (trimmed.toLowerCase() === result.conclusion.trim().toLowerCase()) {
    throw new RuleError("Kesimpulan baru harus berbeda dari kesimpulan yang dianulir.");
  }
  if (conditions.length === 0) throw new RuleError("Pilih minimal satu kondisi pembeda.");

  const attrs = new Set(conditions.map((c) => c.attribute));
  if (attrs.size !== conditions.length) throw new RuleError("Satu atribut hanya boleh dipakai sekali.");

  const cornerstone = kb.nodes[result.firedId].cornerstone;
  for (const cond of conditions) {
    if (!evaluateCondition(cond, newCase)) {
      throw new RuleError(`Kondisi "${formatCondition(cond)}" tidak dipenuhi kasus baru.`);
    }
    if (evaluateCondition(cond, cornerstone)) {
      throw new RuleError(
        `Kondisi "${formatCondition(cond)}" juga dipenuhi kasus kunci Rule ${result.firedId}.`,
      );
    }
  }

  const parent = kb.nodes[result.stop.nodeId];
  const slot = result.stop.branch === "true" ? "trueChild" : "falseChild";
  if (!parent || parent[slot] !== null) {
    throw new RuleError("Knowledge base sudah berubah. Jalankan ulang penelusuran.");
  }

  const node: RuleNode = {
    id: kb.nodes.length,
    conditions: conditions.map((c) => ({ ...c })),
    conclusion: trimmed,
    cornerstone: { ...newCase },
    trueChild: null,
    falseChild: null,
    createdAt: now,
  };
  const nodes = kb.nodes.slice();
  nodes[parent.id] = { ...parent, [slot]: node.id };
  nodes.push(node);
  return { kb: { ...kb, nodes }, node };
}

export function treeDepth(kb: KnowledgeBase): number {
  const depth = (id: number | null): number =>
    id === null ? 0 : 1 + Math.max(depth(kb.nodes[id].trueChild), depth(kb.nodes[id].falseChild));
  return depth(0);
}

export function parentOf(kb: KnowledgeBase, id: number): { parent: RuleNode; branch: "true" | "false" } | null {
  for (const n of kb.nodes) {
    if (n.trueChild === id) return { parent: n, branch: "true" };
    if (n.falseChild === id) return { parent: n, branch: "false" };
  }
  return null;
}

export function uniqueConclusions(kb: KnowledgeBase): string[] {
  return [...new Set(kb.nodes.map((n) => n.conclusion))];
}

export function serializeKB(kb: KnowledgeBase): string {
  return JSON.stringify(kb, null, 2);
}

function fail(message: string): never {
  throw new RuleError(`File knowledge base tidak valid: ${message}`);
}

function validateCase(c: unknown, where: string): Case {
  if (typeof c !== "object" || c === null) fail(`${where} bukan objek kasus.`);
  const obj = c as Record<string, unknown>;
  for (const attr of ATTRIBUTE_ORDER) {
    const v = obj[attr];
    if (isNumeric(attr)) {
      if (typeof v !== "number" || !Number.isFinite(v)) fail(`${where}.${attr} harus angka.`);
    } else if (!CATEGORICAL_ATTRIBUTES[attr].options.some((o) => o.value === v)) {
      fail(`${where}.${attr} bernilai "${String(v)}" yang tidak dikenal.`);
    }
  }
  return Object.fromEntries(ATTRIBUTE_ORDER.map((a) => [a, obj[a]])) as unknown as Case;
}

function validateCondition(c: unknown, where: string): Condition {
  if (typeof c !== "object" || c === null) fail(`${where} bukan objek kondisi.`);
  const { attribute, operator, value } = c as Record<string, unknown>;
  if (typeof attribute !== "string" || !ATTRIBUTE_ORDER.includes(attribute as never)) {
    fail(`${where}.attribute "${String(attribute)}" tidak dikenal.`);
  }
  if (isNumeric(attribute as never)) {
    if (![">", ">=", "<", "<="].includes(operator as string)) fail(`${where}.operator tidak valid.`);
    if (typeof value !== "number" || !Number.isFinite(value)) fail(`${where}.value harus angka.`);
  } else {
    if (!["==", "!="].includes(operator as string)) fail(`${where}.operator tidak valid.`);
    const meta = CATEGORICAL_ATTRIBUTES[attribute as keyof typeof CATEGORICAL_ATTRIBUTES];
    if (!meta.options.some((o) => o.value === value)) fail(`${where}.value tidak dikenal.`);
  }
  return { attribute, operator, value } as Condition;
}

export function parseKB(json: string): KnowledgeBase {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    fail("bukan JSON.");
  }
  const raw = data as { version?: unknown; nodes?: unknown };
  if (raw?.version !== 1) fail("versi tidak didukung.");
  if (!Array.isArray(raw.nodes) || raw.nodes.length === 0) fail("daftar rule kosong.");

  const count = raw.nodes.length;
  const childRef = (v: unknown, where: string): number | null => {
    if (v === null) return null;
    if (typeof v !== "number" || !Number.isInteger(v) || v <= 0 || v >= count) {
      fail(`${where} menunjuk rule yang tidak ada.`);
    }
    return v;
  };

  const nodes: RuleNode[] = raw.nodes.map((n: unknown, i: number) => {
    const where = `Rule ${i}`;
    if (typeof n !== "object" || n === null) fail(`${where} bukan objek.`);
    const o = n as Record<string, unknown>;
    if (o.id !== i) fail(`${where} memiliki id ${String(o.id)}.`);
    if (typeof o.conclusion !== "string" || !o.conclusion.trim()) fail(`${where} tidak punya kesimpulan.`);
    if (!Array.isArray(o.conditions)) fail(`${where}.conditions harus array.`);
    if (i === 0 && o.conditions.length > 0) fail("Rule 0 harus tanpa kondisi (t).");
    if (i > 0 && o.conditions.length === 0) fail(`${where} harus punya minimal satu kondisi.`);
    return {
      id: i,
      conditions: o.conditions.map((c, j) => validateCondition(c, `${where}.conditions[${j}]`)),
      conclusion: o.conclusion,
      cornerstone: validateCase(o.cornerstone, `${where}.cornerstone`),
      trueChild: childRef(o.trueChild, `${where}.trueChild`),
      falseChild: childRef(o.falseChild, `${where}.falseChild`),
      createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date(0).toISOString(),
    };
  });

  const seen = new Set<number>();
  for (const n of nodes) {
    for (const child of [n.trueChild, n.falseChild]) {
      if (child === null) continue;
      if (seen.has(child)) fail(`Rule ${child} memiliki lebih dari satu induk.`);
      seen.add(child);
    }
  }
  const reachable = new Set<number>();
  const stack = [0];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const child of [nodes[id].trueChild, nodes[id].falseChild]) {
      if (child !== null) stack.push(child);
    }
  }
  if (reachable.size !== count) fail("ada rule yang tidak terhubung ke Rule 0.");

  return { version: 1, nodes };
}
