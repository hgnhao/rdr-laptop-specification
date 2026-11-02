"use client";

import React, { useState, useEffect } from "react";
import { Case, Condition, DifferentiatingAttribute, InferenceResult } from "../types/rdr";
import { getDifferentiatingAttributes, addExceptionRule, getRecommendation } from "../lib/api";
import { CheckCircle, XCircle, ArrowRightLeft, PlusCircle, AlertCircle, ShieldCheck } from "lucide-react";

interface ExpertTabProps {
  currentCase: Case | null;
  inferenceResult: InferenceResult | null;
  setInferenceResult: (r: InferenceResult | null) => void;
  onRuleAdded: () => void;
}

export default function ExpertTab({
  currentCase,
  inferenceResult,
  setInferenceResult,
  onRuleAdded,
}: ExpertTabProps) {
  const [expertDecision, setExpertDecision] = useState<"agree" | "disagree" | null>(null);
  const [diffAttributes, setDiffAttributes] = useState<DifferentiatingAttribute[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [newConclusion, setNewConclusion] = useState("");
  const [customNodeId, setCustomNodeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ambil atribut pembeda jika pakar memilih "Tidak Setuju"
  useEffect(() => {
    if (expertDecision === "disagree" && currentCase && inferenceResult) {
      setLoadingDiff(true);
      setErrorMessage(null);
      getDifferentiatingAttributes(currentCase, inferenceResult.last_satisfied_node.id)
        .then((diffs) => {
          setDiffAttributes(diffs);
          // Default pilih kondisi pertama yang valid
          if (diffs.length > 0 && diffs[0].suggested_conditions.length > 0) {
            setSelectedConditions([diffs[0].suggested_conditions[0]]);
          }
        })
        .catch((err) => setErrorMessage(err.message))
        .finally(() => setLoadingDiff(false));
    }
  }, [expertDecision, currentCase, inferenceResult]);

  if (!currentCase || !inferenceResult) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Belum Ada Kasus Aktif</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Silakan masukkan spesifikasi laptop dan jalankan rekomendasi terlebih dahulu di **Tab Konsumen**
          untuk dievaluasi oleh Pakar.
        </p>
      </div>
    );
  }

  const lastNode = inferenceResult.last_satisfied_node;
  const cornerstone = lastNode.cornerstone_case;

  const handleToggleCondition = (cond: Condition) => {
    const exists = selectedConditions.some(
      (c) => c.attribute === cond.attribute && c.operator === cond.operator && c.value === cond.value
    );
    if (exists) {
      setSelectedConditions(
        selectedConditions.filter(
          (c) => !(c.attribute === cond.attribute && c.operator === cond.operator && c.value === cond.value)
        )
      );
    } else {
      setSelectedConditions([...selectedConditions, cond]);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConditions.length === 0) {
      setErrorMessage("Pilih minimal satu kondisi pembeda.");
      return;
    }
    if (!newConclusion.trim()) {
      setErrorMessage("Nama rekomendasi/kesimpulan baru tidak boleh kosong.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await addExceptionRule({
        lastNodeId: lastNode.id,
        newCase: currentCase,
        newConclusion: newConclusion.trim(),
        conditions: selectedConditions,
        customNodeId: customNodeId.trim() || undefined,
      });

      setSuccessMessage(res.message);
      onRuleAdded();

      // Evaluasi ulang kasus
      const updatedResult = await getRecommendation(currentCase);
      setInferenceResult(updatedResult);
      setExpertDecision("agree");
      setNewConclusion("");
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menambahkan rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Kartu Evaluasi Pakar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Evaluasi Pakar (Knowledge Verification)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Verifikasi kesimpulan sistem untuk Kasus Baru. Jika rekomendasi saat ini keliru, lakukan koreksi pengetahuan.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Rekomendasi Sistem Saat Ini:</span>
            <h4 className="text-lg font-extrabold text-slate-800 mt-0.5">
              {inferenceResult.final_conclusion}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Berasal dari Node Terakhir yang Terpenuhi:{" "}
              <span className="font-mono font-semibold text-blue-600">[{lastNode.id}]</span>
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setExpertDecision("agree");
                setSuccessMessage("Pakar menyetujui rekomendasi sistem. Knowledge base tidak diubah.");
              }}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition ${
                expertDecision === "agree"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <CheckCircle className="w-4 h-4" /> Setuju
            </button>

            <button
              onClick={() => {
                setExpertDecision("disagree");
                setSuccessMessage(null);
              }}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition ${
                expertDecision === "disagree"
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-white text-red-700 border-red-200 hover:bg-red-50"
              }`}
            >
              <XCircle className="w-4 h-4" /> Tidak Setuju (Koreksi)
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Panel Akuisisi Pengetahuan RDR jika Pakar Tidak Setuju */}
      {expertDecision === "disagree" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" /> Komparasi: Kasus Baru vs Cornerstone Case ({lastNode.id})
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Atribut pembeda di bawah ini adalah karakteristik yang dipenuhi oleh Kasus Baru namun TIDAK dipenuhi oleh Cornerstone Case acuan.
            </p>
          </div>

          {loadingDiff ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              <span className="animate-spin inline-block rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent mr-2" />
              Menganalisis perbedaan atribut pembeda...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3">Atribut</th>
                    <th className="p-3">Kasus Baru (New Case)</th>
                    <th className="p-3">Cornerstone Case ({lastNode.id})</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diffAttributes.map((diff) => (
                    <tr key={diff.attribute} className="hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-800">{diff.label}</td>
                      <td className="p-3 text-blue-700 font-semibold">{String(diff.new_value)}</td>
                      <td className="p-3 text-slate-500">{String(diff.cornerstone_value)}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                          ⚡ Pembeda
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Form Penyusunan Rule Pengecualian Baru */}
          <form onSubmit={handleAddRule} className="pt-6 border-t border-slate-100 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                1. Pilih Kondisi Pembeda untuk Rule Baru:
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Kondisi yang Anda centang akan menjadi syarat konjungtif (AND) pada node baru.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diffAttributes.flatMap((diff) =>
                  diff.suggested_conditions.map((cond, idx) => {
                    const isSelected = selectedConditions.some(
                      (c) => c.attribute === cond.attribute && c.operator === cond.operator && c.value === cond.value
                    );
                    return (
                      <button
                        key={`${diff.attribute}-${idx}`}
                        type="button"
                        onClick={() => handleToggleCondition(cond)}
                        className={`text-left p-3 rounded-xl border text-sm transition flex items-center justify-between ${
                          isSelected
                            ? "bg-blue-50 border-blue-500 text-blue-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>
                          [{diff.label}] <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{cond.attribute} {cond.operator} {String(cond.value)}</code>
                        </span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  2. Nama Spesifikasi / Rekomendasi Baru:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Laptop Gaming Mid-Range (RTX 4050)"
                  value={newConclusion}
                  onChange={(e) => setNewConclusion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  3. ID Node Kustom (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Auto-generate (misal: rule_1)"
                  value={customNodeId}
                  onChange={(e) => setCustomNodeId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={submitting || selectedConditions.length === 0}
                className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  "Menyimpan Rule..."
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" /> Simpan Rule Pengecualian ke Knowledge Base
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

