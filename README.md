# Sistem Pakar Rekomendasi Spesifikasi Laptop (Ripple Down Rules)

Repositori ini menyediakan implementasi Sistem Pakar Rekomendasi Spesifikasi Laptop menggunakan metode **Ripple Down Rules (RDR)** / *Single Classification Ripple Down Rules (SCRDR)*.

Tersedia dalam **dua opsi arsitektur**:
1. **Opsi Modern Decoupled (Direkomendasikan untuk Web Production)**:
   - **Backend**: **FastAPI** (Python + Pydantic) di folder `backend/`.
   - **Frontend**: **Next.js 14** (React + TypeScript + Tailwind CSS) di folder `frontend/`.
2. **Opsi Standalone Rapid Prototyping**:
   - **Streamlit**: Web App all-in-one di file `app.py`.

---

## 🏛️ Arsitektur Sistem

```text
rdr-laptop-specification/
├── backend/                    # Server RESTful API (FastAPI)
│   ├── main.py                 # Endpoint API (/recommend, /expert/diff, /expert/add-rule, /tree)
│   ├── requirements.txt        # fastapi, uvicorn, pydantic
│   ├── data/default_kb.json    # Knowledge Base JSON
│   └── src/                    # Core RDR Engine & Models (Pydantic)
│
├── frontend/                   # Client Web Application (Next.js 14 App Router)
│   ├── package.json            # React 18, Next 14, Tailwind CSS, Lucide
│   ├── src/
│   │   ├── app/                # Layout & Dashboard page
│   │   ├── components/         # ConsumerTab, ExpertTab, TreeViewer
│   │   ├── lib/api.ts          # API Client ke Backend FastAPI
│   │   └── types/rdr.ts        # Type definition TypeScript
│   └── README.md               # Panduan pengembangan frontend untuk tim
│
├── app.py                      # (Alternatif) Versi Streamlit all-in-one
├── requirements.txt            # Dependensi versi Streamlit
└── data/default_kb.json        # Knowledge Base awal (Rule 0)
```

---

## 🚀 Cara Menjalankan

### Opsi A: Fullstack Modern (FastAPI + Next.js)

#### 1. Jalankan Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Swagger UI tersedia di: [http://localhost:8000/docs](http://localhost:8000/docs)

#### 2. Jalankan Frontend (Next.js)
Buka terminal baru:
```bash
cd frontend
npm install
npm run dev
```
Aplikasi web tersedia di: [http://localhost:3000](http://localhost:3000)

---

### Opsi B: Standalone Streamlit
Jika ingin menjalankan antarmuka Python murni:
```bash
pip install -r requirements.txt
streamlit run app.py
```
Aplikasi terbuka di: [http://localhost:8501](http://localhost:8501)

---

## 🌐 Panduan Deployment ke Cloud

- **Frontend (Next.js)**: Sangat mudah dideploy gratis ke **Vercel** (`https://vercel.com`). Cukup hubungkan repositori ini dan tentukan *Root Directory* ke `frontend`. Atur environment variable `NEXT_PUBLIC_API_URL` ke URL backend Anda.
- **Backend (FastAPI)**: Dapat dideploy secara gratis/terjangkau ke **Railway**, **Render**, atau **Fly.io** dengan perintah start `uvicorn main:app --host 0.0.0.0 --port $PORT` pada direktori `backend`.
