# Usage Guide

Dokumen ini membantu reviewer, operator, atau anggota tim memahami cara memakai OpsDesk pada deployment aktif tanpa harus menebak model produknya.

## URL Aktif

- Frontend: `https://opsdesk-teal.vercel.app`
- Backend API: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- API docs: `https://opsdesk-teal.vercel.app/api-docs`

## Cara Membaca Produk Ini

OpsDesk memiliki dua jenis alur utama:

- alur pelaporan, ketika masalah pertama kali dicatat
- alur operasional, ketika tiket ditriase, diassign, dan ditangani

Pemisahan ini penting. Pembuatan tiket tidak otomatis berarti penugasan sudah selesai.

## Alur Penggunaan Inti

### 1. Login

Masuk memakai akun Cognito yang sudah disiapkan operator.

### 2. Buat tiket

Jika akun Anda `reporter` atau `admin`, buka halaman `Buat Tiket` lalu isi:

- judul
- prioritas
- deskripsi
- lampiran jika diperlukan

Pada tahap ini, tiket masuk ke sistem dengan status awal `open`.

### 3. Pahami bahwa tiket belum tentu langsung diassign

Saat tiket baru dibuat:

- tiket sudah resmi tercatat
- tiket belum tentu punya assignee
- tim operasional masih bisa melakukan triage setelahnya

Model ini disengaja agar keputusan pelaporan dan keputusan assignment tidak tercampur.

### 4. Kelola tiket dari sisi operasional

Jika akun Anda `agent` atau `admin`, Anda dapat:

- membuka dashboard
- melihat daftar tiket operasional
- memfilter tiket yang belum ditugaskan
- mengambil tiket untuk diri sendiri
- memindahkan assignment ke operator lain yang eligible
- mengubah status tiket

### 5. Gunakan queue `Ditugaskan ke Saya`

Halaman ini adalah work queue operator yang sedang login. Hanya tiket yang assignee aktifnya sama dengan akun saat ini yang akan tampil.

Artinya:

- halaman ini tidak menampilkan semua tiket
- halaman ini tidak menampilkan tiket yang hanya pernah Anda komentari
- halaman ini fokus pada tiket yang saat ini menjadi tanggung jawab Anda

### 6. Pantau progres lewat detail tiket

Pada halaman detail tiket, user dapat melihat:

- data pelapor
- assignee saat ini
- status
- komentar
- lampiran
- riwayat aktivitas

## Ringkasan Akses Per Role

| Area / Aksi | Reporter | Agent | Admin |
| --- | --- | --- | --- |
| Buat tiket | Ya | Tidak | Ya |
| Lihat tiket sendiri | Ya | Ya | Ya |
| Lihat daftar tiket operasional | Tidak | Ya | Ya |
| Ubah status | Tidak | Ya | Ya |
| Assign tiket | Tidak | Ya | Ya |
| Akses `Ditugaskan ke Saya` | Tidak | Ya | Ya |

## Jalur Verifikasi Cepat

Jika hanya punya waktu singkat:

1. login
2. buka dashboard
3. buka daftar tiket
4. buat satu tiket baru jika memakai akun `reporter` atau `admin`
5. buka detail tiket
6. jika memakai akun `agent` atau `admin`, ubah status atau assignment
7. pastikan riwayat aktivitas bertambah

## Catatan Operasional

- UI memakai Bahasa Indonesia.
- Role berasal dari Cognito group `reporter`, `agent`, dan `admin`.
- Reporter dibatasi ke tiket yang relevan dengan identitasnya sendiri.
- Daftar tiket memakai query server-side untuk pencarian, filter, sorting, dan pagination.
- Lampiran memakai S3 privat dan diakses melalui presigned URL sementara.
- Jika UI menampilkan `Kode referensi` saat error, gunakan nilai tersebut untuk menelusuri log backend.

## Screenshot

Referensi daftar screenshot ada di [docs/screenshots/README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/screenshots/README.md).
