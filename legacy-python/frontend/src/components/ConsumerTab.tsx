"use client";

import React, { useState } from "react";
import { Case, InferenceResult } from "../types/rdr";
import { getRecommendation } from "../lib/api";
import { Laptop, Cpu, CheckCircle2, XCircle, ChevronDown, ChevronUp, Sparkles, AlertCircle } from "lucide-react";

interface ConsumerTabProps {
  currentCase: Case;
  setCurrentCase: (c: Case) => void;
  inferenceResult: InferenceResult | null;
  setInferenceResult: (r: InferenceResult | null) => void;
  onNavigateToExpert: () => void;
}

export default function ConsumerTab({
  currentCase,
  setCurrentCase,
  inferenceResult,
  setInferenceResult,
  onNavigateToExpert,
}: ConsumerTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await getRecommendation(currentCase);
      setInferenceResult(res);
    } catch (err: any) {
      setError(err.message || "Gagal memproses rekomendasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulir Kebutuhan Laptop */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-600" /> Form Kebutuhan Laptop Konsumen
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tentukan preferensi dan spesifikasi laptop yang Anda butuhkan untuk aktivitas komputasi Anda.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Kolom 1: Atribut Numerik */}
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider text-blue-600">
              1. Kriteria Fisik & Anggaran
            </h3>

            {/* Budget */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">Budget (Anggaran)</label>
                <span className="text-sm font-bold text-blue-600">Rp {currentCase.budget.toFixed(1)} Juta</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="60.0"
                step="0.5"
                value={currentCase.budget}
                onChange={(e) => setCurrentCase({ ...currentCase, budget: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Rp 3 Jt</span>
                <span>Rp 30 Jt</span>
                <span>Rp 60 Jt</span>
              </div>
            </div>

            {/* RAM */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">Kapasitas RAM Minimum</label>
                <span className="text-sm font-bold text-blue-600">{currentCase.ram_gb} GB</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[4, 8, 16, 32, 64].map((gb) => (
                  <button
                    key={gb}
                    type="button"
                    onClick={() => setCurrentCase({ ...currentCase, ram_gb: gb })}
                    className={`py-2 text-sm font-medium rounded-lg border transition ${
                      currentCase.ram_gb === gb
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {gb} GB
                  </button>
                ))}
              </div>
            </div>

            {/* Berat Laptop */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">Maksimum Berat Laptop</label>
                <span className="text-sm font-bold text-blue-600">{currentCase.weight_kg.toFixed(1)} kg</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="4.0"
                step="0.1"
                value={currentCase.weight_kg}
                onChange={(e) => setCurrentCase({ ...currentCase, weight_kg: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0.8 kg (Ultrabook)</span>
                <span>2.0 kg (Standar)</span>
                <span>4.0 kg (Desktop Replacement)</span>
              </div>
            </div>

            {/* Baterai */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-700">Daya Tahan Baterai Minimum</label>
                <span className="text-sm font-bold text-blue-600">{currentCase.battery_hours.toFixed(1)} Jam</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="20.0"
                step="0.5"
                value={currentCase.battery_hours}
                onChange={(e) => setCurrentCase({ ...currentCase, battery_hours: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>2 Jam</span>
                <span>10 Jam</span>
                <span>20 Jam</span>
              </div>
            </div>
          </div>

          {/* Kolom 2: Atribut Kategorikal */}
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider text-blue-600">
              2. Kebutuhan Penggunaan & Hardware
            </h3>

            {/* Penggunaan Utama */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Penggunaan Utama</label>
              <select
                value={currentCase.primary_usage}
                onChange={(e) => setCurrentCase({ ...currentCase, primary_usage: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="Office / School">Office / School (Dokumen, Browsing, Zoom)</option>
                <option value="Programming / Data Science">Programming / Data Science (Coding, Docker, AI)</option>
                <option value="Graphic Design / Video Editing">Graphic Design / Video Editing (Adobe, Rendering)</option>
                <option value="Gaming / 3D Rendering">Gaming / 3D Rendering (AAA Games, Blender, CAD)</option>
                <option value="Ultrabook / Mobility">Ultrabook / Mobility (Bepergian, Sangat Tipis)</option>
              </select>
            </div>

            {/* Kebutuhan GPU */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Kebutuhan Kartu Grafis (GPU)</label>
              <select
                value={currentCase.gpu_required}
                onChange={(e) => setCurrentCase({ ...currentCase, gpu_required: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="Integrated">Integrated (Hemat Daya / Intel Iris / Radeon 680M)</option>
                <option value="Dedicated Entry">Dedicated Entry (RTX 2050 / 3050)</option>
                <option value="Dedicated Mid">Dedicated Mid (RTX 4050 / 4060)</option>
                <option value="Dedicated High">Dedicated High (RTX 4070 / 4080 / 4090)</option>
              </select>
            </div>

            {/* Tipe Layar */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferensi Layar</label>
              <select
                value={currentCase.screen_type}
                onChange={(e) => setCurrentCase({ ...currentCase, screen_type: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="Standard FHD">Standard FHD (1080p Standar)</option>
                <option value="IPS FHD">IPS FHD (Warna Akurat & Sudut Pandang Luas)</option>
                <option value="OLED">OLED (Kontras Tak Terhingga, Hitam Pekat)</option>
                <option value="High Refresh Rate (120Hz+)">High Refresh Rate 120Hz+ (Gaming Mulus)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Mengevaluasi Pohon RDR...
              </span>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Dapatkan Rekomendasi Laptop
              </>
            )}
          </button>
        </div>
      </form>

      {/* Hasil Rekomendasi */}
      {inferenceResult && (
        <div className="bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl shadow-lg p-6 md:p-8 text-white space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                <Cpu className="w-3.5 h-3.5" /> Hasil Inferensi Ripple Down Rules
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold mt-2">
                {inferenceResult.final_conclusion}
              </h3>
              <p className="text-blue-100 text-sm mt-1">
                Dicetuskan oleh Node Terakhir:{" "}
                <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-white font-bold">
                  {inferenceResult.last_satisfied_node.id}
                </span>{" "}
                (Total {inferenceResult.steps.length} node dievaluasi)
              </p>
            </div>

            <button
              onClick={onNavigateToExpert}
              className="px-5 py-2.5 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition shadow-sm text-sm flex-shrink-0"
            >
              Evaluasi di Tab Pakar &rarr;
            </button>
          </div>

          {/* Explainable AI: Jejak Penelusuran */}
          <div className="border-t border-white/20 pt-4">
            <button
              type="button"
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center justify-between w-full text-sm font-semibold text-blue-100 hover:text-white transition"
            >
              <span>🔍 Detail Penelusuran Inferensi RDR (Explainability)</span>
              {showSteps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSteps && (
              <div className="mt-4 space-y-3 bg-black/20 rounded-xl p-4 backdrop-blur-sm">
                {inferenceResult.steps.map((step, idx) => (
                  <div key={idx} className="border-b border-white/10 pb-3 last:border-0 last:pb-0 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        Langkah {idx + 1}: Node `{step.node_id}` ({step.node_conclusion})
                      </span>
                      {step.is_satisfied ? (
                        <span className="flex items-center gap-1 text-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" /> TERPENUHI (True)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-300 text-xs font-bold">
                          <XCircle className="w-4 h-4" /> TIDAK TERPENUHI (False)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-100 mt-1 font-mono">
                      Kondisi: {step.conditions_evaluated}
                    </p>
                    <p className="text-xs text-white/80 mt-1 italic">
                      Cabang: {step.branch_taken} &mdash; {step.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

