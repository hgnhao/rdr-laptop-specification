"use client";

import React, { useState, useEffect } from "react";
import { TreeResponse } from "../types/rdr";
import { getTreeStructure, resetTree } from "../lib/api";
import { GitFork, RefreshCw, RotateCcw, CheckCircle2, ArrowRight } from "lucide-react";

export default function TreeViewer() {
  const [treeData, setTreeData] = useState<TreeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTreeStructure();
      setTreeData(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat pohon");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const handleReset = async () => {
    if (!confirm("Apakah Anda yakin ingin mereset Knowledge Base kembali ke Rule 0 awal?")) return;
    try {
      await resetTree();
      await loadTree();
    } catch (err: any) {
      alert("Gagal mereset: " + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Statistik KB */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <GitFork className="w-5 h-5 text-indigo-600" /> Struktur Pohon Biner Knowledge Base
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Visualisasi hierarki Single Classification Ripple Down Rules (SCRDR).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadTree}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-sm font-medium transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Reset ke Default
            </button>
          </div>
        </div>

        {treeData && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-xs text-blue-600 font-semibold uppercase">Total Rules</span>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">
                {treeData.metadata.total_nodes}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
              <span className="text-xs text-indigo-600 font-semibold uppercase">Kedalaman Pohon</span>
              <p className="text-2xl font-extrabold text-indigo-900 mt-1">
                {treeData.metadata.max_depth}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 col-span-2 md:col-span-1">
              <span className="text-xs text-emerald-600 font-semibold uppercase">Root Node</span>
              <p className="text-2xl font-extrabold text-emerald-900 mt-1">
                {treeData.metadata.root_id}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Tabel Daftar Node */}
      {treeData && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Daftar Seluruh Node pada Knowledge Base</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3">Node ID</th>
                  <th className="p-3">Kesimpulan / Rekomendasi</th>
                  <th className="p-3">Kondisi (Syarat)</th>
                  <th className="p-3">True Child (Exception)</th>
                  <th className="p-3">False Child (Alternative)</th>
                  <th className="p-3">Cornerstone Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {treeData.nodes_flat.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-blue-600">{node.id}</td>
                    <td className="p-3 font-medium text-slate-800">{node.conclusion}</td>
                    <td className="p-3 text-xs text-slate-600 font-mono">
                      {node.conditions.length === 0 ? "ROOT (Selalu True)" : node.conditions.join(" AND ")}
                    </td>
                    <td className="p-3">
                      {node.right_child_id ? (
                        <span className="inline-flex items-center gap-1 font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs">
                          <ArrowRight className="w-3 h-3" /> {node.right_child_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {node.false_child_id ? (
                        <span className="inline-flex items-center gap-1 font-mono text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs">
                          <ArrowRight className="w-3 h-3" /> {node.false_child_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {node.has_cornerstone ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> Ada
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

