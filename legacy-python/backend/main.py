"""
backend/main.py
Server FastAPI untuk Sistem Pakar Rekomendasi Spesifikasi Laptop (Ripple Down Rules)
Menyediakan REST API untuk diakses oleh Frontend Modern (Next.js / React).
"""

import os
import sys
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Pastikan path modul terbaca
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models import Case, Condition, RDRNode
from src.rdr_engine import InferenceResult, RDREngine
from src.rule_acquisition import (
    DifferentiatingAttribute,
    add_exception_rule,
    get_differentiating_attributes,
)

app = FastAPI(
    title="Laptop Specification RDR Expert System API",
    description="Backend REST API untuk Single Classification Ripple Down Rules (SCRDR)",
    version="1.0.0",
)

# Konfigurasi CORS agar frontend React / Next.js dapat memanggil API ini secara leluasa
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Pada production ganti dengan domain frontend Next.js spesifik
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "default_kb.json")


def load_engine() -> RDREngine:
    """Memuat RDREngine dari berkas default_kb.json."""
    if os.path.exists(DATA_PATH):
        try:
            return RDREngine.load_from_json(DATA_PATH)
        except Exception:
            return RDREngine()
    return RDREngine()


# Engine aktif dalam memori backend
engine = load_engine()


# ==========================================
# Schema DTO Request / Response API
# ==========================================
class DiffRequest(BaseModel):
    new_case: Case
    node_id: str = Field(..., description="ID dari node N_last yang ingin dibandingkan cornerstone case-nya")


class AddRuleRequest(BaseModel):
    last_node_id: str
    new_case: Case
    new_conclusion: str
    conditions: List[Condition]
    custom_node_id: Optional[str] = None


class TreeMetadata(BaseModel):
    total_nodes: int
    max_depth: int
    root_id: str


class TreeResponse(BaseModel):
    metadata: TreeMetadata
    tree: Dict[str, Any]
    nodes_flat: List[Dict[str, Any]]
    mermaid_markdown: str


# ==========================================
# Endpoint API
# ==========================================
@app.get("/api/health", tags=["Status"])
def health_check():
    """Mengecek status server backend."""
    return {"status": "ok", "message": "RDR Backend is running"}


@app.post("/api/recommend", response_model=InferenceResult, tags=["Konsumen"])
def get_recommendation(case: Case):
    """
    Menjalankan inferensi RDR berdasarkan input kebutuhan laptop konsumen.
    Mengembalikan rekomendasi akhir, node pemicu terakhir (N_last), serta jejak evaluasi (explainability).
    """
    try:
        result = engine.infer(case)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inferensi gagal: {str(e)}")


@app.post("/api/expert/diff", response_model=List[DifferentiatingAttribute], tags=["Pakar"])
def analyze_differentiating_attributes(req: DiffRequest):
    """
    Menganalisis atribut pembeda antara Kasus Baru dengan Cornerstone Case milik node yang ditolak pakar.
    """
    target_node = engine.find_node_by_id(req.node_id)
    if not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node dengan ID '{req.node_id}' tidak ditemukan.",
        )

    diff_list = get_differentiating_attributes(
        new_case=req.new_case,
        cornerstone_case=target_node.cornerstone_case,
    )
    return diff_list


@app.post("/api/expert/add-rule", tags=["Pakar"])
def create_exception_rule(req: AddRuleRequest):
    """
    Menambahkan rule pengecualian baru ke pohon biner RDR, menyimpannya ke berkas JSON,
    dan mengembalikan struktur node yang baru ditambahkan.
    """
    target_node = engine.find_node_by_id(req.last_node_id)
    if not target_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node dengan ID '{req.last_node_id}' tidak ditemukan.",
        )

    try:
        new_node = add_exception_rule(
            engine=engine,
            last_satisfied_node=target_node,
            new_case=req.new_case,
            new_conclusion=req.new_conclusion,
            conditions=req.conditions,
            custom_node_id=req.custom_node_id,
        )

        # Simpan state ke disk
        engine.save_to_json(DATA_PATH)

        return {
            "success": True,
            "message": f"Rule baru '{new_node.id}' berhasil ditambahkan ke Knowledge Base.",
            "node": new_node.model_dump() if hasattr(new_node, "model_dump") else new_node.dict(),
        }
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/api/tree", response_model=TreeResponse, tags=["Knowledge Base"])
def get_tree_structure():
    """
    Mengambil struktur pohon RDR lengkap dalam bentuk hierarki nested dict,
    daftar node datar (flat list), serta diagram Mermaid untuk kemudahan visualisasi di Frontend.
    """
    all_nodes = engine.get_all_nodes()
    flat_data = []
    for n in all_nodes:
        flat_data.append({
            "id": n.id,
            "conclusion": n.conclusion,
            "conditions": [str(c) for c in n.conditions],
            "has_cornerstone": n.cornerstone_case is not None,
            "right_child_id": n.right_child.id if n.right_child else None,
            "false_child_id": n.false_child.id if n.false_child else None,
        })

    tree_dict = engine.to_dict()
    return TreeResponse(
        metadata=TreeMetadata(
            total_nodes=engine.count_nodes(),
            max_depth=engine.get_max_depth(),
            root_id=engine.root.id,
        ),
        tree=tree_dict,
        nodes_flat=flat_data,
        mermaid_markdown=engine.to_mermaid_markdown(),
    )


@app.post("/api/tree/reset", tags=["Knowledge Base"])
def reset_tree():
    """Mereset Knowledge Base kembali ke Rule 0 awal."""
    global engine
    engine = RDREngine()
    engine.save_to_json(DATA_PATH)
    return {"success": True, "message": "Knowledge base telah di-reset ke Rule 0 default."}


if __name__ == "__main__":
    import uvicorn
    print("Menjalankan RDR FastAPI Server di port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

