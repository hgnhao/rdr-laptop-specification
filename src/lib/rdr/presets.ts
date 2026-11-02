import { addExceptionRule, createDefaultKB, DEFAULT_CORNERSTONE, infer } from "./engine";
import type { Case, Condition, KnowledgeBase } from "./types";

export interface Persona {
  id: string;
  label: string;
  case: Case;
}

export const PERSONAS: Persona[] = [
  { id: "default", label: "Default", case: DEFAULT_CORNERSTONE },
  {
    id: "student",
    label: "Mahasiswa",
    case: { budget: 7_000_000, ram_gb: 8, weight_kg: 1.5, battery_hours: 8, primary_usage: "office", gpu_required: "no", screen_type: "ips" },
  },
  {
    id: "gamer",
    label: "Gamer",
    case: { budget: 18_000_000, ram_gb: 16, weight_kg: 2.3, battery_hours: 5, primary_usage: "gaming", gpu_required: "yes", screen_type: "ips" },
  },
  {
    id: "budget-gamer",
    label: "Gamer hemat",
    case: { budget: 9_000_000, ram_gb: 8, weight_kg: 2.2, battery_hours: 4, primary_usage: "gaming", gpu_required: "yes", screen_type: "tn" },
  },
  {
    id: "editor",
    label: "Video editor",
    case: { budget: 25_000_000, ram_gb: 32, weight_kg: 1.9, battery_hours: 8, primary_usage: "video_editing", gpu_required: "yes", screen_type: "oled" },
  },
  {
    id: "ai",
    label: "AI engineer",
    case: { budget: 40_000_000, ram_gb: 64, weight_kg: 2.5, battery_hours: 4, primary_usage: "ai_training", gpu_required: "yes", screen_type: "ips" },
  },
  {
    id: "traveler",
    label: "Traveler",
    case: { budget: 15_000_000, ram_gb: 16, weight_kg: 1.1, battery_hours: 14, primary_usage: "office", gpu_required: "no", screen_type: "oled" },
  },
];

const persona = (id: string) => PERSONAS.find((p) => p.id === id)!.case;

/**
 * Sesi pakar contoh. Tiap koreksi diputar ulang lewat engine, jadi letak rule
 * dan kasus kuncinya persis sama dengan bila pakar mengisinya lewat aplikasi.
 */
const DEMO_SESSION: { case: Case; conclusion: string; conditions: Condition[] }[] = [
  {
    case: persona("gamer"),
    conclusion: "Laptop Gaming Mid-Range",
    conditions: [
      { attribute: "primary_usage", operator: "==", value: "gaming" },
      { attribute: "gpu_required", operator: "==", value: "yes" },
    ],
  },
  {
    case: persona("editor"),
    conclusion: "Laptop Creator OLED",
    conditions: [
      { attribute: "primary_usage", operator: "==", value: "video_editing" },
      { attribute: "screen_type", operator: "==", value: "oled" },
    ],
  },
  {
    case: persona("ai"),
    conclusion: "Laptop Workstation AI",
    conditions: [
      { attribute: "primary_usage", operator: "==", value: "ai_training" },
      { attribute: "ram_gb", operator: ">=", value: 32 },
    ],
  },
  {
    case: persona("traveler"),
    conclusion: "Ultrabook Premium",
    conditions: [
      { attribute: "weight_kg", operator: "<=", value: 1.3 },
      { attribute: "battery_hours", operator: ">=", value: 10 },
    ],
  },
  {
    case: persona("budget-gamer"),
    conclusion: "Laptop Gaming Entry-Level",
    conditions: [
      { attribute: "budget", operator: "<=", value: 12_000_000 },
      { attribute: "ram_gb", operator: "<=", value: 8 },
    ],
  },
];

export function createDemoKB(now = new Date().toISOString()): KnowledgeBase {
  let kb = createDefaultKB(now);
  for (const step of DEMO_SESSION) {
    kb = addExceptionRule(kb, step.case, infer(kb, step.case), step.conclusion, step.conditions, now).kb;
  }
  return kb;
}

export const CONCLUSION_SUGGESTIONS = [
  "Laptop Gaming Mid-Range",
  "Laptop Gaming Entry-Level",
  "Laptop Creator OLED",
  "Laptop Workstation AI",
  "Ultrabook Premium",
  "Laptop Pelajar Ringan",
];
