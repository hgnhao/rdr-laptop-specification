"""
src/models.py
Definisi schema Pydantic untuk Ripple Down Rules (RDR):
- Condition: Kondisi atribut (numerik atau kategorikal)
- Case: Data spesifikasi kebutuhan laptop
- RDRNode: Node pohon biner RDR (dengan right_child / true_child & false_child)
"""

from __future__ import annotations
from typing import Any, List, Optional, Union
from pydantic import BaseModel, Field


class Case(BaseModel):
    """
    Representasi kasus laptop (input konsumen atau cornerstone case).
    Mencakup atribut numerik dan kategorikal.
    """
    # Atribut Numerik
    budget: float = Field(
        ...,
        description="Budget pengguna dalam Juta Rupiah (contoh: 8.5 untuk Rp 8.500.000)",
        ge=1.0,
        le=100.0,
    )
    ram_gb: int = Field(
        ...,
        description="Kapasitas RAM minimum dalam Gigabyte (contoh: 8, 16, 32)",
        ge=4,
        le=128,
    )
    weight_kg: float = Field(
        ...,
        description="Berat laptop dalam Kilogram (contoh: 1.4 untuk laptop tipis/ultrabook)",
        ge=0.5,
        le=5.0,
    )
    battery_hours: float = Field(
        ...,
        description="Ketahanan baterai dalam Jam pemakaian (contoh: 8.0)",
        ge=1.0,
        le=30.0,
    )

    # Atribut Kategorikal
    primary_usage: str = Field(
        ...,
        description="Penggunaan utama: 'Office / School', 'Programming / Data Science', "
                    "'Graphic Design / Video Editing', 'Gaming / 3D Rendering', 'Ultrabook / Mobility'",
    )
    gpu_required: str = Field(
        ...,
        description="Kebutuhan kartu grafis: 'Integrated', 'Dedicated Entry', 'Dedicated Mid', 'Dedicated High'",
    )
    screen_type: str = Field(
        ...,
        description="Preferensi layar: 'Standard FHD', 'IPS FHD', 'OLED', 'High Refresh Rate (120Hz+)'",
    )

    def get_attr(self, attr_name: str) -> Any:
        """Mengambil nilai atribut berdasarkan string nama atribut."""
        return getattr(self, attr_name, None)

    def to_readable_dict(self) -> dict:
        """Mengembalikan representasi dict yang ramah ditampilkan ke pengguna."""
        return {
            "Budget": f"Rp {self.budget:.1f} Juta",
            "RAM (GB)": f"{self.ram_gb} GB",
            "Berat (kg)": f"{self.weight_kg:.2f} kg",
            "Daya Baterai": f"{self.battery_hours:.1f} jam",
            "Penggunaan Utama": self.primary_usage,
            "Kebutuhan GPU": self.gpu_required,
            "Tipe Layar": self.screen_type,
        }


class Condition(BaseModel):
    """
    Kondisi evaluasi atribut pada rule RDR.
    Mendukung operator numerik: '>', '<', '==', '>=', '<=', '!='
    dan operator kategorikal/string: '==', '!='
    """
    attribute: str = Field(..., description="Nama atribut pada Case, e.g. 'budget', 'ram_gb'")
    operator: str = Field(..., description="Operator perbandingan: >, <, ==, >=, <=, !=")
    value: Union[float, int, str, bool] = Field(..., description="Nilai pembanding")

    def evaluate(self, case: Case) -> bool:
        """
        Mengevaluasi apakah nilai atribut pada case memenuhi kondisi ini.
        Mengembalikan True jika cocok, False jika tidak.
        """
        case_val = getattr(case, self.attribute, None)
        if case_val is None:
            return False

        # Evaluasi Numerik jika kedua nilai bertipe angka
        is_case_numeric = isinstance(case_val, (int, float)) and not isinstance(case_val, bool)
        is_cond_numeric = isinstance(self.value, (int, float)) and not isinstance(self.value, bool)

        if is_case_numeric and is_cond_numeric:
            c_val = float(case_val)
            t_val = float(self.value)
            if self.operator == ">":
                return c_val > t_val
            elif self.operator == "<":
                return c_val < t_val
            elif self.operator == ">=":
                return c_val >= t_val
            elif self.operator == "<=":
                return c_val <= t_val
            elif self.operator == "==":
                return abs(c_val - t_val) < 1e-6
            elif self.operator == "!=":
                return abs(c_val - t_val) >= 1e-6
            return False

        # Evaluasi Kategorikal / String / Boolean
        str_case = str(case_val).strip().lower()
        str_cond = str(self.value).strip().lower()

        if self.operator == "==":
            return str_case == str_cond
        elif self.operator == "!=":
            return str_case != str_cond

        # Jika operator numerik digunakan pada string yang dapat dikonversi ke float
        try:
            c_float = float(case_val)
            t_float = float(self.value)
            if self.operator == ">":
                return c_float > t_float
            elif self.operator == "<":
                return c_float < t_float
            elif self.operator == ">=":
                return c_float >= t_float
            elif self.operator == "<=":
                return c_float <= t_float
        except (ValueError, TypeError):
            pass

        return False

    def __str__(self) -> str:
        """Format string representasi kondisi yang mudah dibaca."""
        if isinstance(self.value, str):
            return f"{self.attribute} {self.operator} '{self.value}'"
        return f"{self.attribute} {self.operator} {self.value}"


class RDRNode(BaseModel):
    """
    Node pada Pohon Biner Ripple Down Rules (RDR).
    
    Karakteristik:
    - id: ID unik string.
    - conditions: Daftar kondisi (konjungsi / AND). List kosong -> selalu True (Rule 0).
    - conclusion: Rekomendasi/spesifikasi laptop.
    - cornerstone_case: Kasus kunci yang memicu node ini.
    - right_child: True-Child (Pengecualian / Exception rule, ditelusuri jika kondisi saat ini TRUE).
    - false_child: False-Child (Alternatif rule, ditelusuri jika kondisi saat ini FALSE).
    """
    id: str = Field(..., description="ID unik node, misal 'rule_0', 'rule_1'")
    conditions: List[Condition] = Field(
        default_factory=list,
        description="Koleksi kondisi yang harus terpenuhi (AND). Jika kosong, selalu True.",
    )
    conclusion: str = Field(..., description="Nama/spesifikasi rekomendasi laptop")
    cornerstone_case: Optional[Case] = Field(
        None,
        description="Cornerstone case (kasus kunci) yang mencetuskan node ini",
    )
    right_child: Optional[RDRNode] = Field(
        None,
        description="True-Child (Exception rule jika kondisi node ini terpenuhi)",
    )
    false_child: Optional[RDRNode] = Field(
        None,
        description="False-Child (Alternative rule jika kondisi node ini tidak terpenuhi)",
    )

    def evaluate_node(self, case: Case) -> bool:
        """
        Mengevaluasi seluruh kondisi pada node ini untuk kasus yang diberikan.
        Jika list conditions kosong (seperti Root Node), selalu bernilai True.
        """
        if not self.conditions:
            return True
        return all(cond.evaluate(case) for cond in self.conditions)

    def is_leaf(self) -> bool:
        """Memeriksa apakah node ini adalah daun (tidak memiliki right_child dan false_child)."""
        return self.right_child is None and self.false_child is None


# Memastikan model rekursif pada Pydantic ter-resolve dengan baik
try:
    RDRNode.model_rebuild()
except AttributeError:
    # Pydantic v1 fallback
    RDRNode.update_forward_refs()

