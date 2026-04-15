# Demo Guide

Dokumen ini membantu dosen, reviewer, atau recruiter mencoba OpsDesk dengan cepat tanpa perlu menebak alur utama aplikasi.

## URL Deployment

- Frontend production: `https://your-frontend-url.vercel.app`
- Backend API base URL: `https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/dev/v1`

Ganti placeholder di atas dengan URL deployment aktif sebelum dibagikan ke reviewer.

## Walkthrough Singkat

1. Buka aplikasi frontend production.
2. Masuk ke halaman dashboard untuk melihat ringkasan tiket.
3. Buka menu daftar tiket untuk melihat data operasional.
4. Gunakan pencarian atau filter status untuk meninjau tiket tertentu.
5. Buat tiket baru dari halaman "Buat Tiket".
6. Setelah tiket tersimpan, buka halaman detail tiket.
7. Ubah status tiket lalu tambahkan komentar tindak lanjut.

## Yang Perlu Diuji Manual

- Dashboard dapat dimuat tanpa error dan menampilkan ringkasan tiket.
- Daftar tiket tampil dengan pencarian dan filter status yang berfungsi.
- Form create ticket menampilkan validasi dan dapat mengarahkan ke detail tiket setelah sukses.
- Detail tiket dapat memuat status terbaru dan daftar komentar.
- Perubahan status dan penambahan komentar berhasil tanpa refresh manual halaman.

## Catatan Demo

- UI teks sengaja menggunakan Bahasa Indonesia agar relevan untuk konteks tugas kuliah lokal.
- Backend tetap memakai arsitektur cloud yang realistis: AWS Lambda, API Gateway HTTP API, dan DynamoDB.
- Scope aplikasi sengaja dijaga kecil agar reviewer bisa melihat kualitas implementasi inti dengan cepat.
