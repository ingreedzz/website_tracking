# Skripsi: Sistem Pelacakan Pesanan Berbasis Web

**Penulis:** Gary Anderson Theng (NIM 825220094)

**Ringkasan**

Pada skripsi ini dijelaskan pengembangan dan analisis sebuah sistem pelacakan pesanan berbasis *web* yang dibangun menggunakan *Vue.js* untuk *frontend* dan *Node.js/Express* untuk *backend* dengan *Supabase* sebagai layanan penyimpanan dan basis data. Sistem mendukung pembuatan pesanan, perubahan status pesanan, unggahan bukti pembayaran, dan pencatatan riwayat perubahan status pada tabel *order_status_history*. Tujuan penelitian adalah menganalisis, menyempurnakan, dan mendokumentasikan fitur-fitur utama aplikasi serta menyusun dokumentasi akademik yang menggambarkan desain, implementasi, pengujian, dan evaluasinya.

---

## Abstrak

Sistem pengelolaan pesanan yang dapat dilacak (order tracking) penting untuk menjaga transparansi operasional dan akuntabilitas dalam aplikasi e-commerce. Penelitian ini memaparkan proses pengembangan, integrasi, dan evaluasi sebuah sistem pelacakan pesanan berbasis web yang menekankan pencatatan riwayat perubahan status (audit trail) serta kemampuan administratif untuk meninjau dan mengelola pesanan. Implementasi memanfaatkan *Vue.js* pada sisi klien, *Node.js/Express* pada sisi server, dan *Supabase* (Postgres + storage) untuk persistensi. Metode evaluasi meliputi pengujian fungsional dan *smoke tests* untuk memastikan bahwa perubahan status tercatat dan dapat diambil kembali melalui API. Hasil menunjukkan bahwa sistem dapat merekam riwayat perubahan secara andal dan menampilkannya di antarmuka administratif, dengan rekomendasi perbaikan pada sentralisasi tampilan riwayat dan mekanisme penghapusan pesanan yang aman.

Kata kunci: pelacakan pesanan; audit trail; Vue.js; Node.js; Supabase; smoke test; diagnostik

---

## Kata Pengantar

(Tempat untuk ucapan terima kasih, pembimbing, dsb.)

---

## Daftar Isi

(Akan diisi otomatis pada tahap akhir atau oleh *Word*/Google Docs)

---

## Bab 1 — Pendahuluan

### 1.1 Latar Belakang
Perkembangan *e-commerce* menuntut sistem yang andal untuk mengelola pesanan dan menyediakan jejak audit atas perubahan status pesanan. Tanpa riwayat perubahan yang terpadu, tim operasional kesulitan melakukan debugging, penagihan, dan penelusuran masalah.

### 1.2 Rumusan Masalah
- Bagaimana merancang dan mengimplementasikan pencatatan riwayat status pesanan pada aplikasi web eksisting?
- Bagaimana menyajikan riwayat tersebut dalam antarmuka yang dapat diakses oleh admin secara terpusat?
- Bagaimana menjamin bahwa perubahan status tercatat secara konsisten tanpa merusak fungsi yang sudah ada?

### 1.3 Tujuan
- Menambah endpoint API yang mengembalikan riwayat status untuk sebuah pesanan.
- Membangun tampilan dasbor terpusat untuk menampilkan riwayat status pesanan.
- Menyediakan pengujian otomatis (smoke test) dan logging untuk memudahkan diagnosis.

### 1.4 Batasan
- Penelitian fokus pada fitur pelacakan status dan audit trail; tidak membahas rekonsiliasi pembayaran eksternal.
- Perubahan dibuat seminimal mungkin agar tidak mengganggu alur produksi yang ada.

### 1.5 Sistematika Penulisan
(Bagian ini akan menjelaskan susunan bab)

---

## Bab 2 — Tinjauan Pustaka

(Bahasan terkait sistem pelacakan pesanan, audit trail, praktik terbaik dalam UI administratif, teknologi *Vue.js*, *Node.js/Express*, dan *Supabase*.)

---

## Bab 3 — Metode dan Desain Sistem

### 3.1 Kebutuhan Fungsional
- CRUD pesanan
- Perubahan status pesanan dan pencatatan riwayat
- Unggah bukti pembayaran
- Tampilan riwayat terpusat untuk admin
- Aksi aman: penghapusan pesanan (dengan konfirmasi dan logging)

### 3.2 Kebutuhan Non-fungsional
- Ketahanan terhadap kegagalan (graceful fallback jika skema DB tidak lengkap)
- Logging yang jelas untuk diagnosa: format `[REQ:<requestId>] [TAG] pesan` pada server
- Kesesuaian perubahan seminimal mungkin pada kode produksi

### 3.3 Arsitektur Sistem
- Diagram arsitektur (sisipkan gambar pada `thesis/img/architecture.png`)
- Komponen: *frontend* (*Vue.js*), *backend* (*Express*), DB (*Postgres/Supabase*), Storage (*Supabase Storage*)

### 3.4 Model Data Utama
- `orders`
- `order_items`
- `payments`
- `order_status_history` (kolom: `order_status_history_id`, `order_id`, `old_status`, `new_status`, `changed_by`, `changed_by_id`, `changed_by_email`, `changed_by_name`, `note`, `created_at`, dsb.)

### 3.5 API yang Digunakan
- `GET /orders/:id` — detail order (+ riwayat setelah modifikasi)
- `PUT /server/orders/:id/status` — ubah status dan catat riwayat
- `POST /server/orders` — buat order

---

## Bab 4 — Implementasi

### 4.1 Perubahan Backend
- File utama: `backend/routes/index.js`
- Tambahkan kueri untuk mengambil riwayat dari `order_status_history` pada handler `GET /orders/:id`, dan lampirkan sebagai `history` pada respons JSON. Jika tabel/kolom tidak ditemukan, fallback dengan `normalized.history = []` dan log peringatan.
- Contoh log server (format):
  - `[REQ:${requestId}] [ORDERS/:id] Fetching history for order ${id}`
  - `[REQ:${requestId}] [ORDERS/:id] History fetch failed — fallback to empty history` (jika error skema)

### 4.2 Perubahan Frontend
- File utama: `src/views/OrderDetail.vue` dan/atau `src/views/Dashboard.vue`
- Rekomendasi: Buat atau perbesar *view* dasbor (`OrderHistoryDashboard.vue`) yang memanggil API untuk daftar riwayat pesanan, letakkan tombol akses riwayat dekat tombol "Buat Pesanan".
- Semua kata berbahasa Inggris di teks skripsi akan diberi *italic* (mis. *dashboard*, *frontend*, *backend*).

### 4.3 Pengujian
- Tambahkan *smoke test* di `tmp/order_status_smoketest.js` yang membuat order, mengubah status via `PUT`, lalu `GET` order untuk memastikan `history` berisi entri terbaru.
- Sertakan langkah menjalankan tes dan contoh output log.

---

## Bab 5 — Pengujian dan Evaluasi

(Rincian hasil smoke test, tabel hasil percobaan, tangkapan layar log, analisis kegagalan bila ada.)

---

## Bab 6 — Pembahasan dan Saran

(Diskusikan trade-offs, batasan implementasi, dan saran seperti sentralisasi tampilan riwayat dan penanganan penghapusan pesanan.)

---

## Bab 7 — Kesimpulan

(Ringkas kontribusi dan rekomendasi untuk pengembangan lanjutan.)

---

## Referensi

(Susun referensi; masukkan dokumentasi *Vue.js*, *Express*, *Supabase*, dan artikel akademik relevan.)

---

## Lampiran

- Cuplikan kode penting (mis. bagian `backend/routes/index.js`)
- Skrip pengujian `tmp/order_status_smoketest.js`
- Hasil keluaran log dan tangkapan layar

---

## Instruksi untuk Konversi ke *Word* / Google Docs

Saya akan menaruh draf ini di `thesis/thesis.md`. Untuk menghasilkan file *Word* (`.docx`) atau mengunggah ke Google Docs, gunakan *Pandoc* atau editor yang mendukung konversi Markdown → Word.

Contoh perintah (jalankan di terminal):

```bash
# Install pandoc jika belum terpasang (Linux)
sudo apt-get update && sudo apt-get install -y pandoc

# Konversi markdown ke docx
pandoc thesis/thesis.md -o thesis/sistemskripsi.docx --reference-doc=template.docx
```

Jika Anda ingin, saya dapat mengonversi file ini menjadi `.docx` di repo dan menyiapkan template `template.docx` untuk format universitas Anda.

---

## Langkah Selanjutnya (yang bisa saya kerjakan sekarang)
- Lengkapi Bab 2 (tinjauan pustaka) dan Bab 5 (hasil pengujian) menggunakan file yang ada.
- Buat `thesis/img/` dan masukkan diagram arsitektur serta tangkapan layar UI.
- Konversi otomatis ke `.docx` dan/atau buat berkas Google Docs (butuh izin jika membuat di akun Anda).

---

(End of initial draft)

