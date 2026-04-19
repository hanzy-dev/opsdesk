# Demo Flow OpsDesk

Panduan ini membantu menyiapkan demo singkat 3-5 menit untuk dosen, recruiter, atau reviewer teknis.

## Tujuan Demo

Tunjukkan bahwa OpsDesk bukan sekadar mockup UI, tetapi aplikasi helpdesk cloud yang benar-benar memiliki:

- autentikasi nyata
- kontrol akses berbasis peran
- dashboard operasional
- ticket workflow
- assignment antar operator
- audit trail
- dokumentasi API

## Persiapan Sebelum Demo

Pastikan sebelum presentasi:

- frontend dapat diakses di `https://opsdesk-teal.vercel.app`
- backend sehat di `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health`
- minimal ada akun `reporter`
- minimal ada akun `agent` atau `admin`
- sudah ada beberapa tiket contoh agar dashboard dan list tidak kosong

Jika ingin menonjolkan assignment antar user, siapkan minimal dua akun operasional:

- satu `agent`
- satu `admin` atau agent kedua

## Alur Demo 3-5 Menit

### 1. Buka halaman login

Narasi singkat:

> OpsDesk memakai Amazon Cognito untuk autentikasi, jadi sesi dan role tidak di-hardcode di frontend.

Poin yang bisa disebut:

- login memakai akun internal
- flow lupa kata sandi dan reset kata sandi sudah tersedia

### 2. Masuk ke dashboard

Tunjukkan:

- kartu statistik utama
- tiket terbaru
- aktivitas terbaru
- quick actions

Narasi singkat:

> Dashboard dirancang sebagai command center operasional, bukan hanya landing page pasif.

### 3. Buka daftar tiket

Tunjukkan:

- pencarian
- filter
- sorting
- pagination

Narasi singkat:

> Daftar tiket sudah memakai query server-side, jadi perilakunya tetap konsisten saat data bertambah.

### 4. Masuk ke detail tiket

Tunjukkan:

- metadata tiket
- assignee saat ini
- komentar
- lampiran
- timeline aktivitas

Narasi singkat:

> Semua perubahan penting dicatat ke audit trail sehingga status, assignment, komentar, dan lampiran bisa ditelusuri dengan jelas.

### 5. Ubah assignment atau status tiket

Pilih salah satu yang paling aman:

- ubah status tiket
- assign tiket ke operator lain yang eligible

Narasi singkat:

> Assignment hanya tersedia untuk role yang berwenang, dan daftar operator diambil dari profil aplikasi yang tersinkron dengan identitas Cognito.

### 6. Tunjukkan API docs

Buka:

`https://opsdesk-teal.vercel.app/api-docs`

Narasi singkat:

> Kontrak API tidak berhenti di codebase; ada OpenAPI dan viewer interaktif agar integrasi dan review teknis lebih mudah dilakukan.

## Narasi Ringkas untuk Dosen atau Recruiter

Versi singkat yang bisa dipakai saat presentasi:

> OpsDesk adalah aplikasi helpdesk cloud untuk dukungan operasional internal. Frontend dibangun dengan React dan Vite, backend memakai Go di AWS Lambda container, API berada di API Gateway, data disimpan di DynamoDB, autentikasi memakai Cognito, dan lampiran memakai S3 privat. Fokus implementasinya adalah alur tiket yang rapi, RBAC nyata, assignment operator, audit trail, dan deployment yang realistis.

## Poin Teknis yang Layak Disebut

Pilih 3-4 poin saja agar presentasi tetap tajam:

- role diselesaikan dari Cognito group `reporter`, `agent`, dan `admin`
- backend memverifikasi JWT dan menerapkan RBAC di level API
- ticket list sudah memakai filter, search, sorting, dan pagination di sisi server
- assignment ke operator lain sudah tersedia untuk role yang berwenang
- lampiran memakai presigned URL ke bucket S3 privat
- activity log pada detail tiket bersifat append-only
- dokumentasi API tersedia dalam OpenAPI dan Swagger UI

## Jalur Demo yang Aman Jika Waktu Sangat Singkat

Jika hanya punya 2-3 menit:

1. login
2. dashboard
3. daftar tiket
4. detail tiket
5. ubah status atau assignment
6. buka API docs

## Catatan Presentasi

- gunakan data demo yang sudah siap agar tidak membuang waktu di form
- hindari skenario yang bergantung pada email verifikasi real-time jika koneksi tidak stabil
- jika ingin menyinggung operator guide, arahkan ke [docs/operator-guide.md](./operator-guide.md)
