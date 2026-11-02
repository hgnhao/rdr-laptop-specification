/**
 * API Client untuk berkomunikasi dengan Backend FastAPI
 */

import { Case, Condition, DifferentiatingAttribute, InferenceResult, TreeResponse } from "../types/rdr";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchHealth(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  if (!res.ok) throw new Error("Gagal menghubungi backend");
  return res.json();
}

export async function getRecommendation(caseData: Case): Promise<InferenceResult> {
  const res = await fetch(`${API_BASE_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(caseData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Gagal memproses rekomendasi" }));
    throw new Error(err.detail || "Gagal memproses rekomendasi");
  }
  return res.json();
}

export async function getDifferentiatingAttributes(
  newCase: Case,
  nodeId: string
): Promise<DifferentiatingAttribute[]> {
  const res = await fetch(`${API_BASE_URL}/api/expert/diff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_case: newCase, node_id: nodeId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Gagal mengambil atribut pembeda" }));
    throw new Error(err.detail || "Gagal mengambil atribut pembeda");
  }
  return res.json();
}

export async function addExceptionRule(params: {
  lastNodeId: string;
  newCase: Case;
  newConclusion: string;
  conditions: Condition[];
  customNodeId?: string;
}): Promise<{ success: boolean; message: string; node: any }> {
  const res = await fetch(`${API_BASE_URL}/api/expert/add-rule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      last_node_id: params.lastNodeId,
      new_case: params.newCase,
      new_conclusion: params.newConclusion,
      conditions: params.conditions,
      custom_node_id: params.customNodeId || null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Gagal menambahkan rule baru" }));
    throw new Error(err.detail || "Gagal menambahkan rule baru");
  }
  return res.json();
}

export async function getTreeStructure(): Promise<TreeResponse> {
  const res = await fetch(`${API_BASE_URL}/api/tree`, { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat struktur pohon Knowledge Base");
  return res.json();
}

export async function resetTree(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/tree/reset`, { method: "POST" });
  if (!res.ok) throw new Error("Gagal mereset Knowledge Base");
  return res.json();
}

