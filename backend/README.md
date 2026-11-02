# Backend FastAPI - Sistem Pakar Laptop (RDR)

RESTful API berbasis **FastAPI**, **Pydantic v2**, dan **Uvicorn** untuk mengelola mesin inferensi pohon biner Ripple Down Rules (SCRDR).

---

## 🚀 Panduan Memulai

### 1. Instalasi Dependensi
```bash
cd backend
pip install -r requirements.txt
```

### 2. Menjalankan Server FastAPI
```bash
uvicorn main:app --reload --port 8000
```

### 3. Dokumentasi Interaktif (Swagger UI)
Setelah server berjalan, buka dokumentasi API interaktif di browser:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📡 Daftar Endpoint Utama

- `GET /api/health`: Health check server.
- `POST /api/recommend`: Menjalankan inferensi RDR untuk input kasus baru.
- `POST /api/expert/diff`: Mengembalikan daftar atribut pembeda antara Kasus Baru dan Cornerstone Case node tertentu.
- `POST /api/expert/add-rule`: Menyisipkan rule pengecualian baru oleh pakar ke Knowledge Base.
- `GET /api/tree`: Mengambil seluruh struktur pohon biner dan metadata hierarki.
- `POST /api/tree/reset`: Mereset Knowledge Base ke Rule 0 awal.

---

## 🌐 Panduan Deployment

Backend FastAPI dapat dideploy dengan mudah di:
1. **Railway / Render**: Buat Web Service baru, arahkan build command `pip install -r backend/requirements.txt` dan start command `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`.
2. **Docker**: Buat container berbasis `python:3.11-slim` dan jalankan via `uvicorn`.

