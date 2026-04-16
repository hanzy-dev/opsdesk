# Usage Guide

Dokumen ini membantu tim atau reviewer memakai OpsDesk pada deployment aktif tanpa framing demo.

## URL Aktif

- Frontend: `https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`
- Backend API: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- Backend environment: `dev`

## Alur Penggunaan Utama

1. Buka frontend production.
2. Masuk menggunakan email dan kata sandi akun internal yang tersedia di Cognito.
3. Tinjau dashboard untuk melihat ringkasan tiket.
4. Buka daftar tiket untuk memeriksa tiket aktif.
5. Gunakan pencarian atau filter status bila diperlukan.
6. Jika akun Anda bertipe pelapor atau admin, buat tiket baru dari halaman "Buat Tiket".
7. Buka detail tiket untuk menambahkan komentar, dan jika akun Anda petugas atau admin, ubah status tiket.
8. Jika akun Anda petugas atau admin, gunakan tombol penugasan untuk mengambil tanggung jawab tiket ke akun Anda.
9. Periksa bagian "Riwayat Aktivitas" pada detail tiket untuk melihat perubahan terbaru.

## Jalur Verifikasi Cepat

Jika hanya punya waktu singkat:

1. Pastikan dashboard dapat dimuat tanpa error.
2. Pastikan daftar tiket menampilkan data.
3. Buat satu tiket baru.
4. Jika login sebagai petugas, ubah status tiket pada halaman detail.
5. Jika login sebagai petugas, klik "Tugaskan ke Saya" dan pastikan nama petugas tampil di detail tiket.
6. Tambahkan satu komentar dan pastikan tampil pada detail tiket.
7. Pastikan timeline aktivitas menampilkan entri pembuatan, perubahan status, komentar, dan penugasan.

## Catatan Operasional

- Teks UI tetap menggunakan Bahasa Indonesia.
- Login sekarang memakai Amazon Cognito dan bearer token JWT.
- RBAC sederhana memakai Cognito group `reporter`, `agent`, dan `admin`.
- Ownership tiket mengikuti identitas login, dan assignment operator masih memakai kebijakan sederhana "tugaskan ke saya".
- Aktivitas tiket dicatat append-only dan ditampilkan pada halaman detail.

## Screenshot

Referensi screenshot tetap ada di [docs/screenshots/README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/screenshots/README.md).
