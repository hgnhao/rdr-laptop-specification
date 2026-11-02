"""
src/rule_acquisition.py
Modul Akuisisi Pengetahuan oleh Pakar (Knowledge Acquisition via Ripple Down Rules)

Alur Kerja:
1. Ketika Pakar menolak kesimpulan rekomendasi sistem untuk Kasus Baru (New Case):
   - Temukan node terakhir yang kondisinya terpenuhi (N_last).
   - Bandingkan New Case dengan Cornerstone Case milik N_last.
   - Hasilkan atribut pembeda (differentiating attributes) di mana New Case = True dan Cornerstone Case = False.
   - Sediakan saran kondisi (operator dan threshold/nilai pembanding).
2. Membentuk RDRNode baru dan menyisipkannya ke dalam struktur pohon:
   - Jika N_last belum memiliki right_child: dipasang sebagai N_last.right_child.
   - Jika N_last sudah memiliki right_child: dipasang di ujung rantai false_child dari right_child N_last
     (sebagai alternatif pengecualian sesuai kaidah SCRDR).
"""

from __future__ import annotations
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from src.models import Case, Condition, RDRNode
from src.rdr_engine import RDREngine


# Label deskriptif untuk atribut Case
ATTRIBUTE_METADATA: Dict[str, Dict[str, Any]] = {
    "budget": {
        "label": "Budget (Juta Rupiah)",
        "is_numeric": True,
        "unit": "Juta IDR",
        "step": 0.5,
    },
    "ram_gb": {
        "label": "Kapasitas RAM (GB)",
        "is_numeric": True,
        "unit": "GB",
        "step": 4,
    },
    "weight_kg": {
        "label": "Berat Laptop (kg)",
        "is_numeric": True,
        "unit": "kg",
        "step": 0.1,
    },
    "battery_hours": {
        "label": "Daya Tahan Baterai (Jam)",
        "is_numeric": True,
        "unit": "Jam",
        "step": 1.0,
    },
    "primary_usage": {
        "label": "Penggunaan Utama",
        "is_numeric": False,
        "unit": "",
        "options": [
            "Office / School",
            "Programming / Data Science",
            "Graphic Design / Video Editing",
            "Gaming / 3D Rendering",
            "Ultrabook / Mobility",
        ],
    },
    "gpu_required": {
        "label": "Kebutuhan GPU",
        "is_numeric": False,
        "unit": "",
        "options": ["Integrated", "Dedicated Entry", "Dedicated Mid", "Dedicated High"],
    },
    "screen_type": {
        "label": "Tipe Layar",
        "is_numeric": False,
        "unit": "",
        "options": ["Standard FHD", "IPS FHD", "OLED", "High Refresh Rate (120Hz+)"],
    },
}


class DifferentiatingAttribute(BaseModel):
    """
    Menyimpan informasi atribut pembeda antara Kasus Baru dan Cornerstone Case.
    Dilengkapi dengan rekomendasi kondisi yang valid (New Case = True, Cornerstone Case = False).
    """
    attribute: str
    label: str
    is_numeric: bool
    new_value: Any
    cornerstone_value: Any
    suggested_conditions: List[Condition] = Field(default_factory=list)


def get_differentiating_attributes(
    new_case: Case,
    cornerstone_case: Optional[Case],
) -> List[DifferentiatingAttribute]:
    """
    Menganalisis perbedaan antara Kasus Baru (New Case) dan Cornerstone Case milik N_last.
    Menghasilkan daftar atribut pembeda beserta rekomendasi kondisi yang valid.
    
    Kondisi dianggap valid jika:
    - cond.evaluate(new_case) == True
    - cond.evaluate(cornerstone_case) == False
    """
    diff_attrs: List[DifferentiatingAttribute] = []

    # Iterasi semua atribut yang ada pada model Case
    case_fields = list(Case.model_fields.keys()) if hasattr(Case, "model_fields") else list(Case.__fields__.keys())

    for attr in case_fields:
        new_val = getattr(new_case, attr, None)
        cc_val = getattr(cornerstone_case, attr, None) if cornerstone_case else None

        meta = ATTRIBUTE_METADATA.get(attr, {"label": attr, "is_numeric": isinstance(new_val, (int, float))})
        label = meta.get("label", attr)
        is_numeric = meta.get("is_numeric", False)

        # Jika cornerstone_case tidak ada, semua nilai new_case dianggap atribut pembeda
        if cornerstone_case is None:
            suggested = [Condition(attribute=attr, operator="==", value=new_val)]
            diff_attrs.append(
                DifferentiatingAttribute(
                    attribute=attr,
                    label=label,
                    is_numeric=is_numeric,
                    new_value=new_val,
                    cornerstone_value="[Tidak Ada CC]",
                    suggested_conditions=suggested,
                )
            )
            continue

        # Jika nilainya identik, bukan atribut pembeda
        if new_val == cc_val:
            continue

        valid_conditions: List[Condition] = []

        if is_numeric:
            try:
                nv_float = float(new_val)
                cv_float = float(cc_val)

                # Kandidat 1: Berdasarkan operator perbandingan terhadap nilai New Case
                # Jika new_val > cc_val
                if nv_float > cv_float:
                    c1 = Condition(attribute=attr, operator=">=", value=nv_float)
                    c2 = Condition(attribute=attr, operator=">", value=cv_float)
                    if c1.evaluate(new_case) and not c1.evaluate(cornerstone_case):
                        valid_conditions.append(c1)
                    if c2.evaluate(new_case) and not c2.evaluate(cornerstone_case) and c2 != c1:
                        valid_conditions.append(c2)

                # Jika new_val < cc_val
                elif nv_float < cv_float:
                    c1 = Condition(attribute=attr, operator="<=", value=nv_float)
                    c2 = Condition(attribute=attr, operator="<", value=cv_float)
                    if c1.evaluate(new_case) and not c1.evaluate(cornerstone_case):
                        valid_conditions.append(c1)
                    if c2.evaluate(new_case) and not c2.evaluate(cornerstone_case) and c2 != c1:
                        valid_conditions.append(c2)

                # Persamaan eksak
                c_eq = Condition(attribute=attr, operator="==", value=new_val)
                if c_eq.evaluate(new_case) and not c_eq.evaluate(cornerstone_case):
                    valid_conditions.append(c_eq)

            except (ValueError, TypeError):
                # Fallback ke evaluasi string/kategorikal jika parsing numerik gagal
                c_eq = Condition(attribute=attr, operator="==", value=new_val)
                if c_eq.evaluate(new_case) and not c_eq.evaluate(cornerstone_case):
                    valid_conditions.append(c_eq)
        else:
            # Evaluasi Kategorikal
            c_eq = Condition(attribute=attr, operator="==", value=new_val)
            c_neq = Condition(attribute=attr, operator="!=", value=cc_val)

            if c_eq.evaluate(new_case) and not c_eq.evaluate(cornerstone_case):
                valid_conditions.append(c_eq)
            if c_neq.evaluate(new_case) and not c_neq.evaluate(cornerstone_case):
                valid_conditions.append(c_neq)

        if valid_conditions:
            diff_attrs.append(
                DifferentiatingAttribute(
                    attribute=attr,
                    label=label,
                    is_numeric=is_numeric,
                    new_value=new_val,
                    cornerstone_value=cc_val,
                    suggested_conditions=valid_conditions,
                )
            )

    return diff_attrs


def generate_next_node_id(engine: RDREngine) -> str:
    """Membuat ID unik yang bersih untuk node baru (misal: 'rule_1', 'rule_2', dst)."""
    existing_ids = {node.id for node in engine.get_all_nodes()}
    counter = 1
    while f"rule_{counter}" in existing_ids:
        counter += 1
    return f"rule_{counter}"


def add_exception_rule(
    engine: RDREngine,
    last_satisfied_node: RDRNode,
    new_case: Case,
    new_conclusion: str,
    conditions: List[Condition],
    custom_node_id: Optional[str] = None,
) -> RDRNode:
    """
    Membuat dan menyisipkan node pengecualian (exception node) baru ke dalam pohon RDR.
    
    Langkah:
    1. Validasi bahwa kondisi yang dipilih terpenuhi oleh new_case.
    2. Validasi bahwa kondisi TIDAK terpenuhi oleh cornerstone_case milik last_satisfied_node (jika ada).
    3. Buat objek RDRNode baru dengan cornerstone_case = new_case.
    4. Pasangkan node baru:
       - Jika last_satisfied_node.right_child is None:
         Pasang langsung sebagai last_satisfied_node.right_child.
       - Jika last_satisfied_node.right_child SUDAH ADA:
         Telusuri rantai false_child dari right_child tersebut hingga mencapai ujung daun (leaf),
         lalu pasangkan node baru sebagai false_child di ujung tersebut.
    """
    if not conditions:
        raise ValueError("Rule pengecualian harus memiliki minimal satu kondisi pembeda.")

    if not new_conclusion or not new_conclusion.strip():
        raise ValueError("Kesimpulan/nama rekomendasi baru tidak boleh kosong.")

    # Validasi kondisi terhadap New Case
    for cond in conditions:
        if not cond.evaluate(new_case):
            raise ValueError(
                f"Kondisi '{cond}' tidak terpenuhi oleh Kasus Baru! Kondisi harus bernilai True untuk Kasus Baru."
            )

    # Validasi kondisi terhadap Cornerstone Case milik N_last
    if last_satisfied_node.cornerstone_case is not None:
        all_satisfied_by_cc = all(cond.evaluate(last_satisfied_node.cornerstone_case) for cond in conditions)
        if all_satisfied_by_cc:
            raise ValueError(
                f"Seluruh kondisi yang dipilih terpenuhi oleh Cornerstone Case milik {last_satisfied_node.id}! "
                f"Paling tidak harus ada 1 kondisi yang bernilai FALSE untuk Cornerstone Case agar rule valid."
            )

    # Tentukan ID node baru
    node_id = custom_node_id.strip() if custom_node_id and custom_node_id.strip() else generate_next_node_id(engine)

    new_node = RDRNode(
        id=node_id,
        conditions=conditions,
        conclusion=new_conclusion.strip(),
        cornerstone_case=new_case,
        right_child=None,
        false_child=None,
    )

    # Pemasangan pada pohon biner RDR
    target_node = engine.find_node_by_id(last_satisfied_node.id)
    if target_node is None:
        target_node = last_satisfied_node

    if target_node.right_child is None:
        target_node.right_child = new_node
    else:
        # Jika cabang pengecualian sudah ada, sisipkan di akhir rantai alternatif (false_child)
        curr = target_node.right_child
        while curr.false_child is not None:
            curr = curr.false_child
        curr.false_child = new_node

    return new_node

