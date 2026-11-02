"use client";

import React, { useState } from "react";
import ConsumerTab from "../components/ConsumerTab";
import ExpertTab from "../components/ExpertTab";
import TreeViewer from "../components/TreeViewer";
import { Case, InferenceResult } from "../types/rdr";
import { Laptop, ShoppingBag, ShieldCheck, GitFork } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"consumer" | "expert" | "tree">("consumer");

  const [currentCase, setCurrentCase] = useState<Case>({
    budget: 12.0,
    ram_gb: 16,
    weight_kg: 1.8,
    battery_hours: 7.0,
    primary_usage: "Office / School",
    gpu_required: "Integrated",
    screen_type: "IPS FHD",
  });

  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Navbar / Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-800 text-base md:text-lg leading-tight">
                LaptopSpec RDR
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sistem Pakar Ripple Down Rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab("consumer")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition ${
                activeTab === "consumer"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> Konsumen
            </button>
            <button
              onClick={() => setActiveTab("expert")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition ${
                activeTab === "expert"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Pakar
            </button>
            <button
              onClick={() => setActiveTab("tree")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition ${
                activeTab === "tree"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GitFork className="w-4 h-4" /> Pohon RDR
            </button>
          </div>
        </div>
      </header>

      {/* Konten Halaman */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        {activeTab === "consumer" && (
          <ConsumerTab
            currentCase={currentCase}
            setCurrentCase={setCurrentCase}
            inferenceResult={inferenceResult}
            setInferenceResult={setInferenceResult}
            onNavigateToExpert={() => setActiveTab("expert")}
          />
        )}

        {activeTab === "expert" && (
          <ExpertTab
            currentCase={currentCase}
            inferenceResult={inferenceResult}
            setInferenceResult={setInferenceResult}
            onRuleAdded={() => {}}
          />
        )}

        {activeTab === "tree" && <TreeViewer />}
      </div>
    </main>
  );
}

