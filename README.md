# Laptop Advisor: Sistem Pakar Ripple Down Rules

Sistem pakar rekomendasi spesifikasi laptop berbasis **Ripple Down Rules (RDR)**. Pakar (konsultan IT / toko) menilai rekomendasi sistem untuk tiap konsumen; bila tidak setuju, pakar membuat rule pengecualian dan sistem langsung belajar.

**Demo:** https://rdr-laptop-specification.vercel.app

## Alur

1. **Konsultasi.** Pakar mengisi kebutuhan konsumen (kasus baru). Sistem menelusuri pohon RDR dan menampilkan kesimpulan beserta jejak penelusurannya.
2. **Setuju.** Rekomendasi diberikan ke konsumen dan proses selesai.
3. **Tidak, buat rule.** Pakar mengisi kesimpulan yang benar, lalu memilih kondisi dari *difference list*: kondisi yang dipenuhi kasus baru dan tidak dipenuhi kasus kunci rule pemberi kesimpulan. Rule baru langsung ditempel ke pohon.

## Teori yang diterapkan

**Knowledge base awal** hanya berisi Rule 0: `t → Laptop Daily Office Entry-Level`, dengan kasus kunci budget Rp 5 juta, penggunaan office, bobot 1,8 kg, tanpa GPU (ditambah RAM 8 GB, baterai 6 jam, layar TN).

**Inferensi** (`infer` di [src/lib/rdr/engine.ts](src/lib/rdr/engine.ts)):

- Penelusuran dimulai dari Rule 0.
- Bila kondisi node terpenuhi, kesimpulannya menggantikan kesimpulan sebelumnya, lalu penelusuran lanjut ke **anak kanan** (true-child, pengecualian).
- Bila tidak terpenuhi, penelusuran lanjut ke **anak kiri** (false-child).
- Penelusuran berhenti di slot kosong. Kesimpulan akhir adalah kesimpulan **terakhir** yang terpenuhi; kesimpulan sebelumnya dianulir.

**Akuisisi rule** (`differenceList`, `addExceptionRule`):

- Kasus kunci yang dibandingkan adalah milik rule pemberi kesimpulan terakhir, yaitu rule yang akan dianulir.
- Setiap kondisi yang dipilih wajib dipenuhi kasus baru dan **tidak** dipenuhi kasus kunci tersebut. Kondisi digabung dengan AND.
  - Numerik: `>`/`≥` atau `<`/`≤`. Nilai batas boleh diubah selama tetap memisahkan kedua kasus.
  - Kategorikal: `=` nilai baru atau `≠` nilai kasus kunci.
- Rule baru ditempel di slot tempat penelusuran berhenti: anak kanan bila node terakhir terpenuhi, anak kiri bila tidak. Kasus baru menjadi kasus kunci rule baru.
- Bila kasus baru identik dengan kasus kunci, tidak ada kondisi pembeda, sehingga rule tidak bisa dibuat.

Konsekuensinya, setiap kasus kunci tetap mendapat kesimpulan dari rule-nya sendiri setelah rule baru ditambahkan. Sifat ini diuji di [engine.test.ts](src/lib/rdr/engine.test.ts).

## Atribut kasus

| Atribut | Jenis | Nilai |
|---|---|---|
| `budget` | numerik | IDR, Rp 3–75 juta |
| `ram_gb` | numerik | 4, 8, 16, 32, 64 GB |
| `weight_kg` | numerik | 0,9–4 kg |
| `battery_hours` | numerik | 2–20 jam |
| `primary_usage` | kategorikal | `office`, `gaming`, `video_editing`, `ai_training` |
| `gpu_required` | kategorikal | `yes`, `no` |
| `screen_type` | kategorikal | `oled`, `ips`, `tn` |

## Fitur lain

- **Knowledge Base**: visualisasi pohon biner (geser, zoom, klik node untuk detail kondisi dan kasus kunci), jalur kasus saat ini disorot, dan slot tempat rule baru akan ditempel.
- **Riwayat** konsultasi yang disetujui atau dikoreksi.
- **Ekspor/Impor** KB sebagai JSON (divalidasi saat impor), **Muat contoh** (KB 6 rule hasil sesi pakar contoh), **Reset** ke Rule 0, dan **Urungkan** untuk tiap perubahan.
- KB tersimpan di `localStorage` browser, jadi tiap browser punya KB sendiri. Gunakan Ekspor/Impor untuk memindahkannya.
- Desain mengikuti prinsip antarmuka Apple: font sistem, animasi spring yang bisa diinterupsi, sheet yang bisa ditarik turun, material translucent, mode gelap, dan dukungan *reduced motion*.

## Menjalankan

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit test engine RDR
npm run build   # build produksi
```

Deploy: `vercel deploy --prod`.

## Struktur

```
src/
├── lib/rdr/          # Engine RDR (tanpa ketergantungan UI)
│   ├── types.ts      # Case, Condition, RuleNode, KnowledgeBase
│   ├── attributes.ts # Metadata dan format atribut
│   ├── engine.ts     # Inferensi, difference list, akuisisi rule, validasi KB
│   ├── presets.ts    # Contoh konsumen dan KB contoh
│   └── engine.test.ts
├── lib/store.ts      # State tersimpan di localStorage
├── lib/treeLayout.ts # Tata letak pohon biner
└── components/       # UI: konsultasi, sheet rule, pohon KB, riwayat
legacy-python/        # Prototipe awal (Streamlit + FastAPI)
```

Stack: Next.js 16, React 19, Tailwind CSS 4, Motion, d3-hierarchy, Vitest.

## Prototipe awal

Versi pertama sistem ini (Streamlit, FastAPI, dan engine RDR berbasis Python) dibuat oleh Kefas dan disimpan di [legacy-python/](legacy-python/). Cara menjalankannya ada di [legacy-python/README.md](legacy-python/README.md); jalankan perintahnya dari dalam folder `legacy-python/`.
