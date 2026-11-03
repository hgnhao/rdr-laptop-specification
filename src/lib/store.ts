import { useSyncExternalStore } from "react";
import { createDefaultKB, parseKB } from "./rdr/engine";
import type { Case, KnowledgeBase } from "./rdr/types";

export interface Consultation {
  id: string;
  at: string;
  case: Case;
  conclusion: string;
  firedId: number;
  verdict: "agree" | "corrected";
  newRuleId?: number;
  newConclusion?: string;
}

export interface AppState {
  kb: KnowledgeBase;
  history: Consultation[];
}

const KEY = "rdr-laptop-advisor/v1";
const SERVER_STATE: AppState = { kb: createDefaultKB("2026-01-01T00:00:00.000Z"), history: [] };

let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        kb: parseKB(JSON.stringify(parsed.kb)),
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    }
  } catch {}
  return { kb: createDefaultKB(), history: [] };
}

function getSnapshot(): AppState {
  if (state === null) state = load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setState(update: (s: AppState) => AppState): AppState {
  const prev = getSnapshot();
  state = update(prev);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
  return prev;
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
