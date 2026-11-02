export type Usage = "office" | "gaming" | "video_editing" | "ai_training";
export type YesNo = "yes" | "no";
export type Screen = "oled" | "ips" | "tn";

/** Satu kasus: kebutuhan dan preferensi calon pembeli. */
export interface Case {
  /** Budget dalam Rupiah (IDR). */
  budget: number;
  ram_gb: number;
  weight_kg: number;
  battery_hours: number;
  primary_usage: Usage;
  gpu_required: YesNo;
  screen_type: Screen;
}

export type NumericAttribute = "budget" | "ram_gb" | "weight_kg" | "battery_hours";
export type CategoricalAttribute = "primary_usage" | "gpu_required" | "screen_type";
export type Attribute = NumericAttribute | CategoricalAttribute;

export type NumericOperator = ">" | ">=" | "<" | "<=";
export type CategoricalOperator = "==" | "!=";
export type Operator = NumericOperator | CategoricalOperator;

export type Condition =
  | { attribute: NumericAttribute; operator: NumericOperator; value: number }
  | { attribute: CategoricalAttribute; operator: CategoricalOperator; value: string };

/**
 * Node pohon biner RDR. Kondisi-kondisinya digabung dengan AND;
 * daftar kosong berarti `t` (selalu benar), dipakai oleh Rule 0.
 */
export interface RuleNode {
  id: number;
  conditions: Condition[];
  conclusion: string;
  /** Kasus kunci (cornerstone case): kasus yang membuat rule ini dibuat. */
  cornerstone: Case;
  /** Anak kanan: pengecualian, dievaluasi bila kondisi node ini terpenuhi. */
  trueChild: number | null;
  /** Anak kiri: dievaluasi bila kondisi node ini tidak terpenuhi. */
  falseChild: number | null;
  createdAt: string;
}

export interface KnowledgeBase {
  version: 1;
  /** `nodes[i].id === i`; Rule 0 selalu di indeks 0 dan menjadi akar. */
  nodes: RuleNode[];
}

export interface ConditionCheck {
  condition: Condition;
  passed: boolean;
}

export interface InferenceStep {
  nodeId: number;
  checks: ConditionCheck[];
  satisfied: boolean;
  /** Node berikutnya yang ditelusuri, atau null bila penelusuran berhenti. */
  next: number | null;
}

export interface InferenceResult {
  /** Kesimpulan terakhir dari node yang kondisinya terpenuhi. */
  conclusion: string;
  /** Node pemberi kesimpulan; kasus kuncinya dipakai untuk difference list. */
  firedId: number;
  steps: InferenceStep[];
  /** Slot kosong tempat penelusuran berhenti, yaitu tempat rule baru ditempel. */
  stop: { nodeId: number; branch: "true" | "false" };
}

export interface Difference {
  attribute: Attribute;
  newValue: Case[Attribute];
  cornerstoneValue: Case[Attribute];
  /** Kondisi yang dipenuhi kasus baru dan tidak dipenuhi kasus kunci. */
  candidates: Condition[];
}
