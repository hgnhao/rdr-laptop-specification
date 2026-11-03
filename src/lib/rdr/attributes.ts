import type {
  Attribute,
  Case,
  CategoricalAttribute,
  Condition,
  NumericAttribute,
  Operator,
} from "./types";

interface NumericMeta {
  kind: "numeric";
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  toDisplay: (v: number) => number;
  fromDisplay: (v: number) => number;
  displayUnit: string;
}

interface CategoricalMeta {
  kind: "categorical";
  label: string;
  options: { value: string; label: string }[];
}

const identity = (v: number) => v;

export const NUMERIC_ATTRIBUTES: Record<NumericAttribute, NumericMeta> = {
  budget: {
    kind: "numeric",
    label: "Budget",
    unit: "IDR",
    min: 3_000_000,
    max: 75_000_000,
    step: 500_000,
    toDisplay: (v) => v / 1_000_000,
    fromDisplay: (v) => Math.round(v * 1_000_000),
    displayUnit: "jt",
  },
  ram_gb: {
    kind: "numeric",
    label: "RAM",
    unit: "GB",
    min: 4,
    max: 64,
    step: 4,
    toDisplay: identity,
    fromDisplay: identity,
    displayUnit: "GB",
  },
  weight_kg: {
    kind: "numeric",
    label: "Bobot",
    unit: "kg",
    min: 0.9,
    max: 4,
    step: 0.1,
    toDisplay: identity,
    fromDisplay: identity,
    displayUnit: "kg",
  },
  battery_hours: {
    kind: "numeric",
    label: "Baterai",
    unit: "jam",
    min: 2,
    max: 20,
    step: 0.5,
    toDisplay: identity,
    fromDisplay: identity,
    displayUnit: "jam",
  },
};

export const RAM_OPTIONS = [4, 8, 16, 32, 64];

export const CATEGORICAL_ATTRIBUTES: Record<CategoricalAttribute, CategoricalMeta> = {
  primary_usage: {
    kind: "categorical",
    label: "Penggunaan",
    options: [
      { value: "office", label: "Office" },
      { value: "gaming", label: "Gaming" },
      { value: "video_editing", label: "Video editing" },
      { value: "ai_training", label: "AI training" },
    ],
  },
  gpu_required: {
    kind: "categorical",
    label: "Butuh GPU",
    options: [
      { value: "yes", label: "Ya" },
      { value: "no", label: "Tidak" },
    ],
  },
  screen_type: {
    kind: "categorical",
    label: "Layar",
    options: [
      { value: "oled", label: "OLED" },
      { value: "ips", label: "IPS" },
      { value: "tn", label: "TN" },
    ],
  },
};

export const ATTRIBUTE_ORDER: Attribute[] = [
  "budget",
  "ram_gb",
  "weight_kg",
  "battery_hours",
  "primary_usage",
  "gpu_required",
  "screen_type",
];

export function isNumeric(attr: Attribute): attr is NumericAttribute {
  return attr in NUMERIC_ATTRIBUTES;
}

export function attributeLabel(attr: Attribute): string {
  return isNumeric(attr) ? NUMERIC_ATTRIBUTES[attr].label : CATEGORICAL_ATTRIBUTES[attr].label;
}

const numberFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function formatNumber(v: number): string {
  return numberFormat.format(v);
}

export function formatValue(attr: Attribute, value: number | string): string {
  if (isNumeric(attr)) {
    const meta = NUMERIC_ATTRIBUTES[attr];
    const v = meta.toDisplay(Number(value));
    return attr === "budget" ? `Rp ${formatNumber(v)} jt` : `${formatNumber(v)} ${meta.displayUnit}`;
  }
  const option = CATEGORICAL_ATTRIBUTES[attr].options.find((o) => o.value === value);
  return option?.label ?? String(value);
}

export const OPERATOR_SYMBOL: Record<Operator, string> = {
  ">": ">",
  ">=": "≥",
  "<": "<",
  "<=": "≤",
  "==": "=",
  "!=": "≠",
};

export function formatCondition(c: Condition): string {
  return `${attributeLabel(c.attribute)} ${OPERATOR_SYMBOL[c.operator]} ${formatValue(c.attribute, c.value)}`;
}

export function summarizeCase(c: Case): string[] {
  return ATTRIBUTE_ORDER.map((attr) => {
    const v = formatValue(attr, c[attr]);
    if (attr === "gpu_required") return c.gpu_required === "yes" ? "Perlu GPU" : "Tanpa GPU";
    return v;
  });
}
