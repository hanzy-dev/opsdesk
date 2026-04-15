# Reviewer Checklist

Dokumen ini dibuat untuk membantu dosen atau reviewer melakukan inspeksi cepat terhadap OpsDesk.

## Review Cepat

1. Buka [README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/README.md) untuk memahami scope proyek.
2. Buka [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml) untuk melihat kontrak API.
3. Buka [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md) untuk langkah run/deploy.
4. Buka [docs/demo-guide.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/demo-guide.md) untuk jalur demo publik yang cepat.
5. Cek `.github/workflows/` untuk melihat CI/CD readiness yang sudah disiapkan.

## Hal Yang Dapat Dicek Dengan Cepat

- frontend berjalan dengan React + Vite + TypeScript
- backend berjalan dengan Go
- backend memakai AWS Lambda + API Gateway HTTP API
- persistence menggunakan DynamoDB
- endpoint API sudah terdokumentasi
- ada workflow GitHub Actions untuk backend dan SAM readiness

## Jalur Verifikasi Minimal

Jika ingin melakukan verifikasi singkat secara manual:

1. Jalankan backend lokal.
2. Jalankan frontend lokal.
3. Buka dashboard dan pastikan ringkasan tiket tampil.
4. Buka daftar tiket lalu coba pencarian dan filter status.
5. Buat satu tiket dari UI.
6. Buka detail tiket.
7. Ubah status tiket.
8. Tambahkan komentar.

## Catatan

OpsDesk sengaja dibatasi pada workflow helpdesk inti agar tetap realistis untuk tugas kuliah, mudah direview, dan tetap layak sebagai proyek portofolio.
