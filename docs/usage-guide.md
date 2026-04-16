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
5. Gunakan kotak pencarian, filter status, filter prioritas, filter assignee, serta kontrol urutan untuk menelusuri tiket dari server.
6. Jika akun Anda bertipe pelapor atau admin, buat tiket baru dari halaman "Buat Tiket".
7. Buka detail tiket untuk menambahkan komentar, dan jika akun Anda petugas atau admin, ubah status tiket.
8. Jika akun Anda petugas atau admin, gunakan tombol penugasan untuk mengambil tanggung jawab tiket ke akun Anda.
9. Gunakan bagian "Lampiran" pada detail tiket untuk mengunggah atau membuka file pendukung.
10. Periksa bagian "Riwayat Aktivitas" pada detail tiket untuk melihat perubahan terbaru.

## Jalur Verifikasi Cepat

Jika hanya punya waktu singkat:

1. Pastikan dashboard dapat dimuat tanpa error.
2. Pastikan daftar tiket menampilkan data.
3. Coba kata kunci pencarian dan pastikan hasil daftar tiket berubah.
4. Coba filter status atau prioritas dan pastikan hasil tetap konsisten setelah pindah halaman.
5. Coba urutkan daftar tiket dan pastikan urutannya berubah.
6. Jika login sebagai petugas atau admin, coba filter "Ditugaskan kepada saya" dan "Belum ditugaskan".
7. Ubah halaman pagination dan pastikan data berikutnya termuat.
8. Buat satu tiket baru.
9. Jika login sebagai petugas, ubah status tiket pada halaman detail.
10. Jika login sebagai petugas, klik "Tugaskan ke Saya" dan pastikan nama petugas tampil di detail tiket.
11. Tambahkan satu komentar dan pastikan tampil pada detail tiket.
12. Unggah satu lampiran yang valid dan pastikan daftar lampiran bertambah.
13. Buka lampiran dari detail tiket dan pastikan file terbuka lewat URL sementara.
14. Pastikan timeline aktivitas menampilkan entri pembuatan, perubahan status, komentar, penugasan, dan lampiran.

## Catatan Operasional

- Teks UI tetap menggunakan Bahasa Indonesia.
- Login sekarang memakai Amazon Cognito dan bearer token JWT.
- RBAC sederhana memakai Cognito group `reporter`, `agent`, dan `admin`.
- Ownership tiket mengikuti identitas login, dan assignment operator masih memakai kebijakan sederhana "tugaskan ke saya".
- Aktivitas tiket dicatat append-only dan ditampilkan pada halaman detail.
- Daftar tiket sekarang memakai query server-side agar pencarian dan pagination tetap konsisten untuk data yang lebih besar.
- Lampiran memakai S3 private dan diakses melalui URL presigned yang berlaku sementara.
- Jika UI menampilkan "Kode referensi" saat error, gunakan nilainya untuk mencari log backend di CloudWatch.

## Screenshot

Referensi screenshot tetap ada di [docs/screenshots/README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/screenshots/README.md).
