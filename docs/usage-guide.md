# Usage Guide

Dokumen ini membantu tim atau reviewer memakai OpsDesk pada deployment aktif tanpa framing demo.

## URL Aktif

- Frontend: `https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`
- Backend API: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- Backend environment: `dev`

## Alur Penggunaan Utama

1. Buka frontend production.
2. Masuk menggunakan placeholder sesi internal yang tersedia saat ini.
3. Tinjau dashboard untuk melihat ringkasan tiket.
4. Buka daftar tiket untuk memeriksa tiket aktif.
5. Gunakan pencarian atau filter status bila diperlukan.
6. Buat tiket baru dari halaman "Buat Tiket".
7. Buka detail tiket untuk mengubah status dan menambahkan komentar.

## Jalur Verifikasi Cepat

Jika hanya punya waktu singkat:

1. Pastikan dashboard dapat dimuat tanpa error.
2. Pastikan daftar tiket menampilkan data.
3. Buat satu tiket baru.
4. Ubah status tiket pada halaman detail.
5. Tambahkan satu komentar dan pastikan tampil pada detail tiket.

## Catatan Operasional

- Teks UI tetap menggunakan Bahasa Indonesia.
- Placeholder sesi pada halaman masuk hanya menjaga alur aplikasi tetap bisa diuji.
- Batch ini belum menambahkan autentikasi nyata atau kontrol akses berbasis peran.

## Screenshot

Referensi screenshot tetap ada di [docs/screenshots/README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/screenshots/README.md).
