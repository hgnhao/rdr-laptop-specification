"""
app.py
Aplikasi Web Sistem Pakar Rekomendasi Spesifikasi Laptop
Berbasis Ripple Down Rules (SCRDR - Single Classification RDR)
Teknologi: Python, Pydantic, Streamlit

Memiliki 3 Tab:
1. Tab Konsumen: Form input kebutuhan laptop & inferensi rekomendasi RDR.
2. Tab Pakar: Evaluasi rekomendasi & panel akuisisi rule (perbandingan New Case vs Cornerstone Case).
3. Tab Struktur Pohon & KB Manager: Visualisasi biner tree RDR & manajemen simpan/muat JSON.
"""

import json
import os
import sys
import pandas as pd
import streamlit as st

# Pastikan root direktori terdaftar pada sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models import Case, Condition, RDRNode
from src.rdr_engine import RDREngine
from src.rule_acquisition import (
    ATTRIBUTE_METADATA,
    DifferentiatingAttribute,
    add_exception_rule,
    generate_next_node_id,
    get_differentiating_attributes,
)

# Konfigurasi Halaman Streamlit
st.set_page_config(
    page_title="Sistem Pakar Rekomendasi Laptop (RDR)",
    page_icon="💻",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Path ke berkas default Knowledge Base
DEFAULT_KB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "default_kb.json")


# ==========================================
# Inisialisasi Session State
# ==========================================
def initialize_session_state():
    """Inisialisasi Knowledge Base dan status aplikasi pada Streamlit Session State."""
    if "engine" not in st.session_state:
        if os.path.exists(DEFAULT_KB_PATH):
            try:
                st.session_state.engine = RDREngine.load_from_json(DEFAULT_KB_PATH)
            except Exception as e:
                st.warning(f"Gagal memuat {DEFAULT_KB_PATH}: {e}. Menggunakan Root default.")
                st.session_state.engine = RDREngine()
        else:
            st.session_state.engine = RDREngine()

    if "current_case" not in st.session_state:
        st.session_state.current_case = None

    if "inference_result" not in st.session_state:
        st.session_state.inference_result = None

    if "expert_action" not in st.session_state:
        st.session_state.expert_action = None  # None | 'agree' | 'disagree'


initialize_session_state()
engine: RDREngine = st.session_state.engine


# ==========================================
# Sidebar Info & Ringkasan Sistem
# ==========================================
with st.sidebar:
    st.title("💻 Sistem Pakar Laptop")
    st.caption("Berbasis Ripple Down Rules (SCRDR)")

    st.markdown("---")
    st.subheader("📊 Statistik Knowledge Base")
    total_rules = engine.count_nodes()
    tree_depth = engine.get_max_depth()
    st.metric("Total Rules (Nodes)", total_rules)
    st.metric("Kedalaman Pohon", tree_depth)

    st.markdown("---")
    st.markdown(
        """
        **Prinsip Kerja RDR:**
        - **Pohon Biner**: Setiap node mengevaluasi kondisi.
        - **True-Child (`right_child`)**: Cabang Pengecualian (*Exception*).
        - **False-Child (`false_child`)**: Cabang Alternatif.
        - **Non-Destructive**: Menambah rule baru tidak akan merusak integritas *Cornerstone Cases* sebelumnya.
        """
    )
    st.markdown("---")
    st.caption("Pengembangan Sistem Pakar RPP ITB")


# ==========================================
# Header Utama
# ==========================================
st.title("💻 Sistem Rekomendasi Spesifikasi Laptop")
st.markdown(
    "Aplikasi Sistem Pakar menggunakan metode **Ripple Down Rules (RDR)** dengan pemeliharaan pengetahuan inkremental."
)

tab_consumer, tab_expert, tab_tree = st.tabs([
    "🛒 1. Tab Konsumen (Rekomendasi)",
    "👨‍🏫 2. Tab Pakar (Evaluasi & Tambah Rule)",
    "🌳 3. Tab Struktur Pohon & KB Manager",
])


# ==============================================================================
# TAB 1: KONSUMEN (REKOMENDASI)
# ==============================================================================
with tab_consumer:
    st.header("Form Kebutuhan Spesifikasi Laptop")
    st.markdown("Masukkan kriteria dan kebutuhan laptop Anda di bawah ini:")

    with st.form("consumer_form"):
        col1, col2 = st.columns(2)

        with col1:
            st.subheader("🔢 Kebutuhan Fisik & Anggaran")
            budget = st.slider(
                "Budget (Juta Rupiah)",
                min_value=3.0,
                max_value=60.0,
                value=float(st.session_state.current_case.budget) if st.session_state.current_case else 12.0,
                step=0.5,
                help="Anggaran maksimal dalam satuan Juta Rupiah (contoh: 12.5 = Rp 12.500.000)",
            )

            ram_gb = st.select_slider(
                "Kapasitas RAM Minimum (GB)",
                options=[4, 8, 16, 32, 64],
                value=int(st.session_state.current_case.ram_gb) if st.session_state.current_case else 16,
                help="Kapasitas memori RAM yang dibutuhkan",
            )

            weight_kg = st.slider(
                "Maksimum Berat Laptop (kg)",
                min_value=0.8,
                max_value=4.0,
                value=float(st.session_state.current_case.weight_kg) if st.session_state.current_case else 1.8,
                step=0.1,
                help="Laptop tipis/ultrabook umumnya < 1.4 kg, laptop gaming 2.0 - 3.0 kg",
            )

            battery_hours = st.slider(
                "Daya Tahan Baterai Minimum (Jam)",
                min_value=2.0,
                max_value=20.0,
                value=float(st.session_state.current_case.battery_hours) if st.session_state.current_case else 7.0,
                step=0.5,
                help="Perkiraan ketahanan baterai untuk aktivitas sehari-hari",
            )

        with col2:
            st.subheader("🎯 Kebutuhan Fungsional & Komponen")
            primary_usage_opts = ATTRIBUTE_METADATA["primary_usage"]["options"]
            default_usage_idx = (
                primary_usage_opts.index(st.session_state.current_case.primary_usage)
                if st.session_state.current_case and st.session_state.current_case.primary_usage in primary_usage_opts
                else 0
            )
            primary_usage = st.selectbox(
                "Penggunaan Utama",
                options=primary_usage_opts,
                index=default_usage_idx,
                help="Tujuan utama komputasi laptop",
            )

            gpu_opts = ATTRIBUTE_METADATA["gpu_required"]["options"]
            default_gpu_idx = (
                gpu_opts.index(st.session_state.current_case.gpu_required)
                if st.session_state.current_case and st.session_state.current_case.gpu_required in gpu_opts
                else 0
            )
            gpu_required = st.selectbox(
                "Kebutuhan Kartu Grafis (GPU)",
                options=gpu_opts,
                index=default_gpu_idx,
                help="Pilih Integrated untuk efisiensi baterai atau Dedicated untuk performa grafis tinggi",
            )

            screen_opts = ATTRIBUTE_METADATA["screen_type"]["options"]
            default_screen_idx = (
                screen_opts.index(st.session_state.current_case.screen_type)
                if st.session_state.current_case and st.session_state.current_case.screen_type in screen_opts
                else 1
            )
            screen_type = st.selectbox(
                "Preferensi Tipe Layar",
                options=screen_opts,
                index=default_screen_idx,
                help="Kualitas dan karakteristik panel layar",
            )

        submit_btn = st.form_submit_button(
            "🔍 Dapatkan Rekomendasi Laptop",
            type="primary",
            use_container_width=True,
        )

    if submit_btn:
        # Buat instance Case
        new_case = Case(
            budget=budget,
            ram_gb=ram_gb,
            weight_kg=weight_kg,
            battery_hours=battery_hours,
            primary_usage=primary_usage,
            gpu_required=gpu_required,
            screen_type=screen_type,
        )
        st.session_state.current_case = new_case
        st.session_state.expert_action = None

        # Jalankan Inferensi RDR
        result = engine.infer(new_case)
        st.session_state.inference_result = result
        st.rerun()

    # Tampilkan Hasil Inferensi jika sudah ada
    if st.session_state.inference_result and st.session_state.current_case:
        result = st.session_state.inference_result
        case = st.session_state.current_case

        st.markdown("---")
        st.success("### 🎉 Rekomendasi Laptop Ditemukan!")

        res_col1, res_col2 = st.columns([3, 2])
        with res_col1:
            st.info(f"#### 🏷️ Rekomendasi: **{result.final_conclusion}**")
            st.markdown(
                f"- **Node Pemicu Terakhir ($N_{{last}}$)**: `{result.last_satisfied_node.id}`\n"
                f"- **Jumlah Langkah Penelusuran**: {len(result.steps)} node dievaluasi"
            )

        with res_col2:
            st.markdown("##### 📋 Profil Kasus yang Dimasukkan:")
            case_df = pd.DataFrame(
                list(case.to_readable_dict().items()),
                columns=["Atribut", "Nilai"],
            )
            st.dataframe(case_df, hide_index=True, use_container_width=True)

        # Explainable AI: Detail Jejak Inferensi
        with st.expander("🔍 Lihat Jejak Inferensi RDR (Explainability / Transparansi)", expanded=False):
            st.markdown("Alur evaluasi kondisi pohon biner RDR dari Root Node:")
            for idx, step in enumerate(result.steps, start=1):
                icon = "✅" if step.is_satisfied else "❌"
                status_badge = "**TERPENUHI (True)**" if step.is_satisfied else "*TIDAK TERPENUHI (False)*"
                st.markdown(
                    f"**Langkah {idx}**: Node `{step.node_id}` — Kesimpulan kandidat: *'{step.node_conclusion}'*\n"
                    f"- Evaluasi Kondisi: `{step.conditions_evaluated}` ➔ {icon} {status_badge}\n"
                    f"- Cabang yang diambil: `{step.branch_taken}`\n"
                    f"- *Catatan*: {step.description}"
                )
                if idx < len(result.steps):
                    st.divider()

        st.info("💡 **Untuk Pakar**: Anda dapat mengevaluasi dan menambahkan rule pengecualian jika rekomendasi di atas kurang tepat di **Tab 2 (Tab Pakar)**.")


# ==============================================================================
# TAB 2: PAKAR (EVALUASI & AKUISISI RULE)
# ==============================================================================
with tab_expert:
    st.header("👨‍🏫 Evaluasi Pakar & Akuisisi Pengetahuan")
    st.markdown(
        "Pada tab ini, Pakar memverifikasi apakah rekomendasi sistem untuk Kasus Baru sudah tepat. "
        "Jika **Tidak Setuju**, sistem akan membandingkan kasus baru dengan *Cornerstone Case* ($N_{last}$) "
        "untuk membuat rule pengecualian baru."
    )

    if st.session_state.current_case is None or st.session_state.inference_result is None:
        st.warning(
            "⚠️ Belum ada kasus yang dimasukkan oleh konsumen. "
            "Silakan lakukan pencarian rekomendasi terlebih dahulu di **Tab 1 (Konsumen)**."
        )
    else:
        current_case = st.session_state.current_case
        inference_result = st.session_state.inference_result
        last_node = inference_result.last_satisfied_node
        cornerstone = last_node.cornerstone_case

        st.subheader("1. Evaluasi Rekomendasi Saat Ini")
        st.write(f"Sistem merekomendasikan: **{inference_result.final_conclusion}** (dari Node `{last_node.id}`)")

        # Tombol Persetujuan Pakar
        btn_col1, btn_col2, _ = st.columns([2, 2, 4])
        with btn_col1:
            if st.button("✅ Setuju (Sesuai)", type="secondary", use_container_width=True):
                st.session_state.expert_action = "agree"
                st.rerun()

        with btn_col2:
            if st.button("❌ Tidak Setuju (Koreksi)", type="primary", use_container_width=True):
                st.session_state.expert_action = "disagree"
                st.rerun()

        # Respon Persetujuan
        if st.session_state.expert_action == "agree":
            st.success(
                f"✅ **Pakar Menyetujui Rekomendasi**: Rekomendasi '{inference_result.final_conclusion}' "
                f"sudah sesuai dengan pengetahuan pakar. Tidak ada perubahan pada Knowledge Base."
            )

        elif st.session_state.expert_action == "disagree":
            st.markdown("---")
            st.subheader("2. Panel Akuisisi Pengetahuan Baru (RDR Rule Acquisition)")
            st.markdown(
                f"Pakar menolak rekomendasi. Sistem mencari perbedaan antara **Kasus Baru** dengan "
                f"**Cornerstone Case milik Node `{last_node.id}`** untuk membangun rule pengecualian."
            )

            # Tabel Komparasi Kasus Baru vs Cornerstone Case
            st.markdown("#### ⚖️ Perbandingan: Kasus Baru vs Cornerstone Case ($N_{last}$)")
            diff_list = get_differentiating_attributes(current_case, cornerstone)

            comp_rows = []
            case_fields = list(Case.model_fields.keys()) if hasattr(Case, "model_fields") else list(Case.__fields__.keys())
            for attr in case_fields:
                meta = ATTRIBUTE_METADATA.get(attr, {"label": attr})
                label = meta.get("label", attr)
                nv = getattr(current_case, attr)
                cv = getattr(cornerstone, attr) if cornerstone else "-"
                is_different = nv != cv
                comp_rows.append({
                    "Atribut": label,
                    "Kasus Baru (New Case)": str(nv),
                    "Cornerstone Case (N_last)": str(cv),
                    "Status Pembeda": "⚡ Berbeda (Pembeda)" if is_different else "Identik (Sama)",
                })

            st.dataframe(pd.DataFrame(comp_rows), hide_index=True, use_container_width=True)

            # Form Akuisisi Rule Baru
            st.markdown("#### 🛠️ Form Pembuatan Rule Pengecualian Baru")

            if not diff_list:
                st.error("⚠️ Tidak ditemukan atribut pembeda antara Kasus Baru dan Cornerstone Case! Kasus baru identik dengan kasus kunci.")
            else:
                st.info(
                    "Pilih satu atau beberapa kondisi pembeda di bawah ini. Kondisi yang dipilih harus bernilai "
                    "**TRUE untuk Kasus Baru** dan **FALSE untuk Cornerstone Case**."
                )

                # Siapkan opsi kondisi otomatis dari diff_list
                suggested_options = []
                condition_map = {}
                for diff in diff_list:
                    for cond in diff.suggested_conditions:
                        cond_label = f"[{diff.label}] {cond}"
                        suggested_options.append(cond_label)
                        condition_map[cond_label] = cond

                with st.form("add_rule_form"):
                    st.markdown("##### A. Pilih Kondisi Pembeda yang Disarankan:")
                    selected_cond_labels = st.multiselect(
                        "Pilih Kondisi (Minimal 1 Kondisi):",
                        options=suggested_options,
                        default=[suggested_options[0]] if suggested_options else [],
                        help="Kondisi ini menjamin kasus baru dipisahkan secara akurat dari kasus kunci sebelumnya.",
                    )

                    st.markdown("##### B. Input Kesimpulan Baru dari Pakar:")
                    new_conclusion = st.text_input(
                        "Nama Spesifikasi / Rekomendasi Baru:",
                        value="",
                        placeholder="Contoh: Laptop Gaming Mid-Range (RTX 4050, High Refresh Rate)",
                        help="Kesimpulan yang seharusnya diberikan oleh sistem untuk kasus seperti ini.",
                    )

                    suggested_id = generate_next_node_id(engine)
                    custom_id = st.text_input(
                        "ID Node Baru (Opsional):",
                        value=suggested_id,
                        help="Identitas unik untuk node baru pada Knowledge Base.",
                    )

                    save_rule_btn = st.form_submit_button(
                        "💾 Simpan Rule Pengecualian Baru",
                        type="primary",
                        use_container_width=True,
                    )

                if save_rule_btn:
                    if not selected_cond_labels:
                        st.error("❌ Anda harus memilih minimal 1 kondisi pembeda.")
                    elif not new_conclusion.strip():
                        st.error("❌ Nama kesimpulan / rekomendasi baru tidak boleh kosong.")
                    else:
                        selected_conditions = [condition_map[lbl] for lbl in selected_cond_labels]
                        try:
                            # Tambahkan rule pengecualian ke KB
                            new_node = add_exception_rule(
                                engine=engine,
                                last_satisfied_node=last_node,
                                new_case=current_case,
                                new_conclusion=new_conclusion,
                                conditions=selected_conditions,
                                custom_node_id=custom_id,
                            )

                            # Simpan ke file JSON
                            engine.save_to_json(DEFAULT_KB_PATH)

                            # Evaluasi ulang kasus saat ini
                            new_res = engine.infer(current_case)
                            st.session_state.inference_result = new_res
                            st.session_state.expert_action = None

                            st.success(
                                f"🎉 Berhasil menambahkan Node baru `{new_node.id}`! "
                                f"Rule baru telah dipasangkan ke dalam pohon RDR dan tersimpan di `{DEFAULT_KB_PATH}`."
                            )
                            st.rerun()

                        except Exception as e:
                            st.error(f"❌ Gagal menambahkan rule baru: {str(e)}")


# ==============================================================================
# TAB 3: STRUKTUR POHON & KB MANAGER
# ==============================================================================
with tab_tree:
    st.header("🌳 Visualisasi Pohon RDR & Knowledge Base Manager")
    st.markdown(
        "Eksplorasi struktur biner Knowledge Base Ripple Down Rules serta kelola penyimpanan/pemuatan berkas JSON."
    )

    # 1. Visualisasi Grafis Pohon
    st.subheader("1. Visualisasi Struktur Pohon Biner")
    viz_tab1, viz_tab2, viz_tab3 = st.tabs(["📊 Graphviz Interaktif", "📈 Diagram Mermaid", "📑 Daftar Node Lengkap"])

    with viz_tab1:
        st.markdown("**Diagram Alur Pohon RDR (Graphviz):**")
        st.caption("Garis Hijau = True (Exception Child) | Garis Merah Putus-putus = False (Alternative Child)")
        try:
            dot_str = engine.to_dot_graph()
            st.graphviz_chart(dot_str, use_container_width=True)
        except Exception as e:
            st.warning(f"Tidak dapat merender Graphviz chart: {e}")

    with viz_tab2:
        st.markdown("**Mermaid Markdown Diagram:**")
        st.markdown(engine.to_mermaid_markdown())

    with viz_tab3:
        st.markdown("**Daftar Seluruh Node dalam Pohon RDR:**")
        all_nodes = engine.get_all_nodes()
        nodes_data = []
        for n in all_nodes:
            conds_str = "ROOT (Selalu True)" if not n.conditions else " AND ".join(str(c) for c in n.conditions)
            nodes_data.append({
                "ID": n.id,
                "Kesimpulan": n.conclusion,
                "Kondisi": conds_str,
                "True-Child (Right)": n.right_child.id if n.right_child else "-",
                "False-Child (Left)": n.false_child.id if n.false_child else "-",
                "Ada Cornerstone Case": "Ya" if n.cornerstone_case else "Tidak",
            })
        st.dataframe(pd.DataFrame(nodes_data), hide_index=True, use_container_width=True)

    st.markdown("---")

    # 2. Knowledge Base Manager (Simpan / Muat / Reset)
    st.subheader("2. Knowledge Base File Manager")

    kb_col1, kb_col2, kb_col3 = st.columns(3)

    with kb_col1:
        st.markdown("##### 💾 Simpan ke Berkas Default")
        if st.button("Simpan ke default_kb.json", use_container_width=True):
            try:
                engine.save_to_json(DEFAULT_KB_PATH)
                st.success(f"Knowledge Base berhasil disimpan ke `{DEFAULT_KB_PATH}`")
            except Exception as e:
                st.error(f"Gagal menyimpan: {e}")

    with kb_col2:
        st.markdown("##### 🔄 Muat Ulang dari Berkas")
        if st.button("Muat Ulang default_kb.json", use_container_width=True):
            try:
                st.session_state.engine = RDREngine.load_from_json(DEFAULT_KB_PATH)
                st.session_state.inference_result = None
                st.success("Knowledge Base berhasil dimuat ulang.")
                st.rerun()
            except Exception as e:
                st.error(f"Gagal memuat: {e}")

    with kb_col3:
        st.markdown("##### ♻️ Reset ke Default (Rule 0)")
        if st.button("Reset KB (Hanya Rule 0)", type="secondary", use_container_width=True):
            st.session_state.engine = RDREngine()
            st.session_state.engine.save_to_json(DEFAULT_KB_PATH)
            st.session_state.inference_result = None
            st.warning("Knowledge Base telah di-reset ke Rule 0 awal.")
            st.rerun()

    # Ekspor & Impor File JSON
    st.markdown("---")
    st.markdown("##### 📤 Ekspor & 📥 Impor Berkas JSON Kustom")
    exp_col, imp_col = st.columns(2)

    with exp_col:
        kb_json_str = json.dumps(engine.to_dict(), indent=2, ensure_ascii=False)
        st.download_button(
            label="⬇️ Download Knowledge Base Saat Ini (.json)",
            data=kb_json_str,
            file_name="laptop_rdr_kb.json",
            mime="application/json",
            use_container_width=True,
        )

    with imp_col:
        uploaded_file = st.file_uploader("Unggah Berkas KB JSON:", type=["json"])
        if uploaded_file is not None:
            try:
                uploaded_data = json.load(uploaded_file)
                new_engine = RDREngine.from_dict(uploaded_data)
                st.session_state.engine = new_engine
                st.session_state.inference_result = None
                st.success("Knowledge base berhasil dimuat dari berkas unggahan!")
            except Exception as e:
                st.error(f"Format JSON tidak valid: {e}")

