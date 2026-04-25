# Reviewer Checklist

Dokumen ini membantu reviewer teknis mengevaluasi OpsDesk dengan cepat tanpa harus membaca seluruh repository terlebih dahulu. Fokus checklist ini adalah produk, arsitektur cloud, kontrak API, dan kesiapan operasional dasar.

## 1. Produk dan Demo

- Buka frontend production: `https://opsdesk-teal.vercel.app`
- Pastikan UI berbahasa Indonesia dan alur utama mudah dipahami.
- Login dengan akun Cognito yang sudah disiapkan.
- Coba alur minimal:
  - reporter membuat tiket
  - agent/admin melihat daftar tiket
  - agent/admin mengubah status atau assignment
  - komentar ditambahkan pada detail tiket
  - lampiran diuji melalui presigned URL bila akun dan data demo tersedia

Panduan demo lengkap tersedia di [demo-guide.md](./demo-guide.md).

## 2. Arsitektur Cloud

Pastikan komponen utama terlihat jelas:

- Frontend React + Vite dideploy di Vercel.
- Backend Go berjalan sebagai AWS Lambda container image.
- API diekspos melalui AWS API Gateway HTTP API.
- Autentikasi memakai Amazon Cognito Bearer JWT.
- Role aplikasi bersumber dari Cognito group `reporter`, `agent`, dan `admin`.
- Data tiket dan profil disimpan di DynamoDB.
- Lampiran berada di S3 privat dengan presigned upload/download URL.
- Infrastruktur backend dikelola melalui AWS SAM.

Referensi: [architecture.md](./architecture.md) dan [diagram-pack.md](./diagram-pack.md).

## 3. RESTful API dan Swagger

- Buka Swagger UI: `https://opsdesk-teal.vercel.app/api-docs`
- Pastikan kontrak berasal dari [openapi.yaml](./openapi.yaml).
- Pastikan endpoint yang didokumentasikan adalah endpoint yang benar-benar diimplementasikan.
- Verifikasi ringkasan method:
  - `GET` untuk health, identitas, profil, notifikasi, tiket, detail, aktivitas, dan download URL lampiran.
  - `POST` untuk pembuatan tiket, komentar, upload URL lampiran, dan registrasi metadata lampiran.
  - `PATCH` untuk partial update profil, status tiket, dan assignment tiket.
- Catatan penting: OpsDesk API tidak mengekspos endpoint `PUT`; `PUT` hanya dipakai oleh browser/client saat upload langsung ke S3 menggunakan presigned URL.

Referensi: [api.md](./api.md).

## 4. Keamanan dan RBAC

- Pastikan endpoint protected membutuhkan bearer token Cognito.
- Pastikan role `reporter`, `agent`, dan `admin` memiliki kemampuan berbeda.
- Pastikan aksi operasional tetap divalidasi backend, bukan hanya disembunyikan dari UI.
- Pastikan lampiran tidak publik dan hanya diakses melalui presigned URL sementara.
- Pastikan dokumentasi tidak meminta token, password, atau secret disimpan di repository.

Referensi: [operator-guide.md](./operator-guide.md) dan [operations.md](./operations.md).

## 5. Deployment dan Operasional

- Backend API base URL: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- Health endpoint: `/health`
- Stack SAM aktif: `opsdesk-dev`
- Region AWS: `ap-southeast-1`
- Frontend origin production: `https://opsdesk-teal.vercel.app`

Checklist rilis yang lebih detail tersedia di [release-checklist.md](./release-checklist.md).

## 6. Batasan yang Perlu Dipahami

OpsDesk production-oriented, tetapi belum diklaim sebagai platform ITSM enterprise penuh. Batasan utama:

- notifikasi belum real-time penuh dan belum mengirim email otomatis
- SLA belum memakai kalender bisnis kompleks
- observability belum mencakup alerting dan tracing lanjutan
- attachment belum melalui malware scanning otomatis
- help center masih berupa konten lokal ringan

Roadmap dan batasan lebih lengkap ada di [README.md](../README.md).
