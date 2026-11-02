"""
src/rdr_engine.py
Mesin Inferensi Ripple Down Rules (SCRDR - Single Classification RDR)
Mengelola:
- Evaluasi inferensi biner pohon RDR
- Pelacakan langkah inferensi (Explainable AI / Inference Path)
- Serialisasi dan Deserialisasi Knowledge Base (JSON)
- Operasi traversal dan visualisasi pohon (Mermaid / Graphviz DOT)
"""

from __future__ import annotations
import json
import os
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from src.models import Case, Condition, RDRNode


class InferenceStep(BaseModel):
    """
    Merekam satu langkah evaluasi dalam penelusuran pohon RDR.
    Berguna untuk explainability dan transparansi penarikan kesimpulan.
    """
    node_id: str
    node_conclusion: str
    conditions_evaluated: str
    is_satisfied: bool
    branch_taken: str  # 'right_child (True / Pengecualian)' | 'false_child (False / Alternatif)' | 'STOP'
    updated_conclusion: bool
    description: str


class InferenceResult(BaseModel):
    """
    Hasil inferensi RDR secara lengkap:
    - final_conclusion: rekomendasi laptop akhir
    - last_satisfied_node: node terakhir yang kondisinya terpenuhi (N_last)
    - steps: riwayat langkah evaluasi
    """
    final_conclusion: str
    last_satisfied_node: RDRNode
    steps: List[InferenceStep] = Field(default_factory=list)


class RDREngine:
    """
    Mesin inferensi RDR berbasis pohon biner.
    Aturan Penelusuran:
    1. Mulai dari Root Node (Rule 0).
    2. Rekomendasi akhir adalah rekomendasi TERAKHIR dari node yang kondisinya TERPENUHI.
    3. Jika kondisi node terpenuhi: konklusi diperbarui, lanjut ke right_child (True / Pengecualian).
    4. Jika kondisi node TIDAK terpenuhi: konklusi tidak berubah, lanjut ke false_child (False / Alternatif).
    5. Berhenti saat tidak ada anak lagi pada cabang yang dipilih.
    """

    def __init__(self, root: Optional[RDRNode] = None):
        if root is None:
            self.root = self.create_default_root()
        else:
            self.root = root

    @staticmethod
    def create_default_root() -> RDRNode:
        """
        Membuat Rule 0 (Root Node) default:
        - conditions: [] (kosong -> selalu True)
        - conclusion: "Laptop Daily Office Entry-Level"
        - cornerstone_case: kasus acuan default untuk kebutuhan komputasi ringan harian
        """
        default_case = Case(
            budget=6.5,
            ram_gb=8,
            weight_kg=1.6,
            battery_hours=6.0,
            primary_usage="Office / School",
            gpu_required="Integrated",
            screen_type="Standard FHD",
        )
        return RDRNode(
            id="rule_0",
            conditions=[],
            conclusion="Laptop Daily Office Entry-Level",
            cornerstone_case=default_case,
            right_child=None,
            false_child=None,
        )

    def infer(self, case: Case) -> InferenceResult:
        """
        Menjalankan proses inferensi RDR untuk kasus baru.
        
        Algoritma:
        1. current = self.root
        2. last_satisfied = None
        3. Loop:
           - Evaluasi kondisi current dengan case.
           - Jika True:
               last_satisfied = current
               next_node = current.right_child
           - Jika False:
               next_node = current.false_child
           - Jika next_node is None: break
           - current = next_node
        4. Return conclusion dari last_satisfied.
        """
        if self.root is None:
            raise ValueError("Knowledge base kosong. Root node belum diinisialisasi.")

        steps: List[InferenceStep] = []
        current_node: Optional[RDRNode] = self.root
        last_satisfied_node: Optional[RDRNode] = None
        current_conclusion: str = "Tidak ada rekomendasi"

        while current_node is not None:
            # Evaluasi kondisi node saat ini
            is_satisfied = current_node.evaluate_node(case)
            cond_str = (
                "Kondisi Kosong (Selalu True / Root Rule)"
                if not current_node.conditions
                else " AND ".join(str(c) for c in current_node.conditions)
            )

            if is_satisfied:
                last_satisfied_node = current_node
                current_conclusion = current_node.conclusion
                branch = "right_child (True / Pengecualian)" if current_node.right_child else "STOP (Tidak ada anak pengecualian)"
                step = InferenceStep(
                    node_id=current_node.id,
                    node_conclusion=current_node.conclusion,
                    conditions_evaluated=cond_str,
                    is_satisfied=True,
                    branch_taken=branch,
                    updated_conclusion=True,
                    description=f"Node '{current_node.id}' TERPENUHI. Konklusi diperbarui menjadi '{current_node.conclusion}'. "
                                f"Menelusuri True-Child (Pengecualian).",
                )
                steps.append(step)
                current_node = current_node.right_child
            else:
                branch = "false_child (False / Alternatif)" if current_node.false_child else "STOP (Tidak ada anak alternatif)"
                step = InferenceStep(
                    node_id=current_node.id,
                    node_conclusion=current_node.conclusion,
                    conditions_evaluated=cond_str,
                    is_satisfied=False,
                    branch_taken=branch,
                    updated_conclusion=False,
                    description=f"Node '{current_node.id}' TIDAK TERPENUHI. Konklusi tetap '{current_conclusion}'. "
                                f"Menelusuri False-Child (Alternatif).",
                )
                steps.append(step)
                current_node = current_node.false_child

        if last_satisfied_node is None:
            # Fallback jika terjadi anomali (seharusnya tidak mungkin jika root selalu True)
            last_satisfied_node = self.root
            current_conclusion = self.root.conclusion

        return InferenceResult(
            final_conclusion=current_conclusion,
            last_satisfied_node=last_satisfied_node,
            steps=steps,
        )

    def find_node_by_id(self, node_id: str) -> Optional[RDRNode]:
        """Mencari node dalam pohon berdasarkan string ID-nya (rekursif)."""
        def _search(curr: Optional[RDRNode]) -> Optional[RDRNode]:
            if curr is None:
                return None
            if curr.id == node_id:
                return curr
            found = _search(curr.right_child)
            if found:
                return found
            return _search(curr.false_child)

        return _search(self.root)

    def get_all_nodes(self) -> List[RDRNode]:
        """Mengambil seluruh daftar node dalam pohon RDR."""
        nodes: List[RDRNode] = []

        def _traverse(curr: Optional[RDRNode]):
            if curr is None:
                return
            nodes.append(curr)
            _traverse(curr.right_child)
            _traverse(curr.false_child)

        _traverse(self.root)
        return nodes

    def count_nodes(self) -> int:
        """Menghitung total node pada Knowledge Base."""
        return len(self.get_all_nodes())

    def get_max_depth(self) -> int:
        """Menghitung kedalaman maksimum pohon biner RDR."""
        def _depth(curr: Optional[RDRNode]) -> int:
            if curr is None:
                return 0
            return 1 + max(_depth(curr.right_child), _depth(curr.false_child))

        return _depth(self.root)

    # ==========================================
    # Serialisasi & Deserialisasi JSON
    # ==========================================

    def to_dict(self) -> Dict[str, Any]:
        """Mengubah pohon RDR menjadi dictionary terstruktur."""
        try:
            return self.root.model_dump(mode="json")
        except AttributeError:
            return self.root.dict()

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> RDREngine:
        """Membuat instance RDREngine dari dictionary data node."""
        try:
            root_node = RDRNode.model_validate(data)
        except AttributeError:
            root_node = RDRNode.parse_obj(data)
        return cls(root=root_node)

    def save_to_json(self, file_path: str) -> None:
        """Menyimpan Knowledge Base RDR ke file JSON."""
        dir_name = os.path.dirname(file_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

        data = self.to_dict()
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @classmethod
    def load_from_json(cls, file_path: str) -> RDREngine:
        """Memuat Knowledge Base RDR dari file JSON."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File Knowledge Base tidak ditemukan: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)

    # ==========================================
    # Visualisasi Pohon (Mermaid & Graphviz DOT)
    # ==========================================

    def to_mermaid_markdown(self) -> str:
        """
        Menghasilkan diagram visualisasi pohon biner RDR dalam format Mermaid Markdown.
        Sangat cocok dirender di Streamlit atau markdown viewer.
        """
        lines = ["```mermaid", "graph TD"]

        def _build_mermaid(node: Optional[RDRNode]):
            if node is None:
                return

            cond_text = (
                "ROOT (Default)"
                if not node.conditions
                else "<br/>".join(str(c) for c in node.conditions)
            )
            # Sanitasi label untuk Mermaid
            clean_conc = node.conclusion.replace('"', "'")
            clean_cond = cond_text.replace('"', "'")

            label = f'"{node.id}<br/><b>{clean_conc}</b><br/><small>{clean_cond}</small>"'
            lines.append(f"    {node.id}[{label}]")

            if node.right_child:
                lines.append(f"    {node.id} -->|True / Pengecualian| {node.right_child.id}")
                _build_mermaid(node.right_child)

            if node.false_child:
                lines.append(f"    {node.id} -.->|False / Alternatif| {node.false_child.id}")
                _build_mermaid(node.false_child)

        _build_mermaid(self.root)
        lines.append("```")
        return "\n".join(lines)

    def to_dot_graph(self) -> str:
        """
        Menghasilkan string format Graphviz DOT untuk visualisasi interaktif via st.graphviz_chart.
        """
        dot_lines = [
            "digraph RDRTree {",
            '    graph [rankdir=TB, bgcolor="transparent"];',
            '    node [shape=box, style="filled,rounded", fontname="Helvetica", fillcolor="#F0F4F8", color="#2B6CB0", penwidth=1.5];',
            '    edge [fontname="Helvetica", fontsize=10];',
        ]

        def _build_dot(node: Optional[RDRNode]):
            if node is None:
                return

            cond_str = (
                "Kondisi: [Selalu True]"
                if not node.conditions
                else "\\n".join(str(c) for c in node.conditions)
            )
            safe_conc = node.conclusion.replace('"', '\\"')
            safe_cond = cond_str.replace('"', '\\"')

            fill = "#D1E7DD" if not node.conditions else "#E2E8F0"
            color = "#0F5132" if not node.conditions else "#475569"

            dot_lines.append(
                f'    "{node.id}" [label="{node.id}\\n★ {safe_conc}\\n({safe_cond})", fillcolor="{fill}", color="{color}"];'
            )

            if node.right_child:
                dot_lines.append(
                    f'    "{node.id}" -> "{node.right_child.id}" [label="True (Exception)", color="#198754", fontcolor="#198754", penwidth=2.0];'
                )
                _build_dot(node.right_child)

            if node.false_child:
                dot_lines.append(
                    f'    "{node.id}" -> "{node.false_child.id}" [label="False (Alternative)", style=dashed, color="#DC3545", fontcolor="#DC3545"];'
                )
                _build_dot(node.false_child)

        _build_dot(self.root)
        dot_lines.append("}")
        return "\n".join(dot_lines)

