import { hierarchy, tree } from "d3-hierarchy";
import type { InferenceResult, KnowledgeBase, RuleNode } from "./rdr/types";

export const NODE_W = 236;
export const SLOT_W = 168;
export const SLOT_H = 44;
const GAP_X = 28;
const GAP_Y = 76;
const PAD = 48;

type Branch = "true" | "false";

interface HNode {
  id: number | null;
  kind: "node" | "slot" | "empty";
  children?: HNode[];
}

export interface PlacedNode {
  id: number;
  x: number;
  y: number;
  h: number;
}

export interface PlacedEdge {
  key: string;
  from: number;
  to: number | "slot";
  branch: Branch;
  d: string;
  mid: { x: number; y: number };
}

export interface TreeLayout {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  slot: { x: number; y: number; parent: number; branch: Branch } | null;
  width: number;
  height: number;
}

const CARD_FONT = '600 15px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif';
const CARD_TEXT_W = NODE_W - 28;
let measureCtx: CanvasRenderingContext2D | null | undefined;

function conclusionLines(text: string): number {
  if (measureCtx === undefined) {
    measureCtx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return text.length > 24 ? 2 : 1;
  measureCtx.font = CARD_FONT;
  return measureCtx.measureText(text).width <= CARD_TEXT_W - 4 ? 1 : 2;
}

/** Tinggi kartu node; harus sejalan dengan padding dan isi kartu di TreeCanvas. */
export function nodeHeight(node: RuleNode): number {
  const chips = Math.max(1, node.conditions.length);
  const lines = conclusionLines(node.conclusion);
  return 28 + 18 + 6 + lines * 20 + 10 + chips * 22 + (chips - 1) * 4;
}

export function layoutTree(kb: KnowledgeBase, stop: InferenceResult["stop"] | null): TreeLayout {
  const build = (id: number): HNode => {
    const n = kb.nodes[id];
    const slotHere = stop?.nodeId === id;
    if (n.trueChild === null && n.falseChild === null && !slotHere) return { id, kind: "node" };
    const side = (child: number | null, branch: Branch): HNode =>
      child !== null
        ? build(child)
        : slotHere && stop!.branch === branch
          ? { id: null, kind: "slot" }
          : { id: null, kind: "empty" };
    // Anak kiri = false-child, anak kanan = true-child.
    return { id, kind: "node", children: [side(n.falseChild, "false"), side(n.trueChild, "true")] };
  };

  const root = hierarchy(build(0));
  tree<HNode>()
    .nodeSize([NODE_W + GAP_X, 1])
    .separation((a, b) => {
      if (a.data.kind === "empty" || b.data.kind === "empty") return 0.55;
      return a.parent === b.parent ? 1 : 1.12;
    })(root);

  const heightOf = (h: HNode) => (h.kind === "node" ? nodeHeight(kb.nodes[h.id!]) : SLOT_H);
  const rowHeight: number[] = [];
  for (const d of root.descendants()) {
    if (d.data.kind === "empty") continue;
    rowHeight[d.depth] = Math.max(rowHeight[d.depth] ?? 0, heightOf(d.data));
  }
  const rowTop: number[] = [];
  let acc = 0;
  for (let i = 0; i < rowHeight.length; i++) {
    rowTop[i] = acc;
    acc += (rowHeight[i] ?? 0) + GAP_Y;
  }

  const visible = root.descendants().filter((d) => d.data.kind !== "empty");
  const minX = Math.min(...visible.map((d) => d.x! - (d.data.kind === "slot" ? SLOT_W : NODE_W) / 2));
  const maxX = Math.max(...visible.map((d) => d.x! + (d.data.kind === "slot" ? SLOT_W : NODE_W) / 2));
  const shiftX = PAD - minX;

  const pos = new Map<HNode, { x: number; y: number; h: number }>();
  for (const d of visible) {
    pos.set(d.data, { x: d.x! + shiftX, y: rowTop[d.depth] + PAD, h: heightOf(d.data) });
  }

  const nodes: PlacedNode[] = [];
  const edges: PlacedEdge[] = [];
  let slot: TreeLayout["slot"] = null;

  for (const d of visible) {
    const p = pos.get(d.data)!;
    if (d.data.kind === "slot") {
      slot = { x: p.x, y: p.y, parent: d.parent!.data.id!, branch: stop!.branch };
      continue;
    }
    nodes.push({ id: d.data.id!, x: p.x, y: p.y, h: p.h });
    d.children?.forEach((child, i) => {
      if (child.data.kind === "empty") return;
      const c = pos.get(child.data)!;
      const branch: Branch = i === 0 ? "false" : "true";
      const x1 = p.x;
      const y1 = p.y + p.h;
      const x2 = c.x;
      const y2 = c.y;
      const k = (y2 - y1) / 2;
      const to = child.data.kind === "slot" ? "slot" : child.data.id!;
      edges.push({
        key: `${d.data.id}-${branch}`,
        from: d.data.id!,
        to,
        branch,
        d: `M ${x1} ${y1} C ${x1} ${y1 + k}, ${x2} ${y2 - k}, ${x2} ${y2}`,
        mid: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
      });
    });
  }

  return { nodes, edges, slot, width: maxX - minX + PAD * 2, height: acc - GAP_Y + PAD * 2 };
}
