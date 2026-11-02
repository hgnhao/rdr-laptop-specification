# Frontend Next.js - Sistem Pakar Laptop (RDR)

Frontend modern berbasis **Next.js 14 (App Router)**, **TypeScript**, dan **Tailwind CSS** untuk antarmuka Sistem Rekomendasi Spesifikasi Laptop dengan metode **Ripple Down Rules (RDR)**.

---

## 🏗️ Arsitektur Frontend

- **`src/app/`**: Next.js App Router (Layout utama & Navigasi Tab).
- **`src/components/`**: Komponen modular:
  - `ConsumerTab.tsx`: Form input kebutuhan laptop & display hasil rekomendasi dengan pelacakan *Explainable AI*.
  - `ExpertTab.tsx`: Panel evaluasi persetujuan pakar, komparasi *New Case* vs *Cornerstone Case*, dan pembuatan rule pengecualian baru.
  - `TreeViewer.tsx`: Visualisasi struktur pohon biner Knowledge Base dan tabel inspeksi node.
- **`src/lib/api.ts`**: API Client yang berkomunikasi langsung dengan backend **FastAPI**.
- **`src/types/rdr.ts`**: Definisi tipe TypeScript yang 100% selaras dengan Schema Pydantic backend.

---

## 🚀 Panduan Memulai (Local Development)

### 1. Prasyarat
- Node.js versi 18+ (direkomendasikan Node.js 20 LTS)
- Backend FastAPI sudah berjalan di `http://localhost:8000`

### 2. Instalasi Paket Dependensi
```bash
cd frontend
npm install
# atau
pnpm install / yarn install
```

### 3. Konfigurasi Environment (Opsional)
Secara default, frontend akan menghubungi `http://localhost:8000`. Jika backend berjalan di alamat/port lain, buat file `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Menjalankan Server Development
```bash
npm run dev
```
Buka browser di: [http://localhost:3000](http://localhost:3000).

---

## 💡 Ide Peningkatan & Ekstensi untuk Dilanjutkan

1. **Visualisasi Pohon Interaktif Tingkat Lanjut**:
   - Pasang library `@xyflow/react` (React Flow) untuk visualisasi pohon biner yang bisa di-drag, zoom, pan, dan custom node card biner (*Right Child* / *False Child*).
2. **Katalog Produk Laptop Nyata**:
   - Tambahkan integrasi rekomendasi laptop nyata (Acer, ASUS, Lenovo, Apple, Dell) yang cocok dengan spek hasil konklusi rule.
3. **Autentikasi Peran (Role-Based Auth)**:
   - Tambahkan proteksi login khusus pakar (misal menggunakan NextAuth.js atau JWT) untuk Tab Pakar.

---

## 🌐 Panduan Deployment

- **Frontend**: Deploy gratis dan instan di **Vercel** (cukup import repo ini dan arahkan root folder ke `frontend`). Isi Environment Variable `NEXT_PUBLIC_API_URL` dengan URL backend FastAPI Anda di cloud.
- **Backend**: Deploy di **Railway**, **Render**, atau **Fly.io** (lihat panduan di `backend/README.md`).

