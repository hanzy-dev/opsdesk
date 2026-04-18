# OpsDesk

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TypeScript-3178C6)](./frontend)
[![Backend](https://img.shields.io/badge/Backend-Go-00ADD8)](./backend)
[![AWS Stack](https://img.shields.io/badge/AWS-Lambda%20%7C%20API%20Gateway%20%7C%20DynamoDB%20%7C%20Cognito%20%7C%20S3-FF9900)](./infra)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%2B%20AWS%20SAM-111111)](./docs/setup.md)
[![CI/CD: Vercel + AWS SAM](https://img.shields.io/badge/CI%2FCD-Vercel%20%2B%20AWS%20SAM-4f46e5)](./docs/release-checklist.md)
[![Status: Production-Oriented](https://img.shields.io/badge/Status-Production--Oriented-0A7F5A)](./README.md)

OpsDesk adalah aplikasi helpdesk dan ticketing berbasis cloud untuk kebutuhan dukungan operasional internal. Repository ini memuat implementasi frontend web, backend Go, infrastruktur AWS, dan dokumentasi pendukung yang digunakan oleh sistem yang telah dideploy.

## Ringkasan

OpsDesk dikembangkan sebagai platform helpdesk yang terfokus, dengan akses terautentikasi, kontrol akses berbasis peran, pengelolaan siklus hidup tiket, lampiran yang aman, serta panduan deployment yang selaras dengan kondisi sistem saat ini.

Konstanta deployment tetap untuk repository ini:

- Domain frontend: `https://opsdesk-teal.vercel.app`
- Environment backend: `dev`
- API base URL: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- Region Cognito: `ap-southeast-1`
- Cognito user pool ID: `ap-southeast-1_sMFqei7IT`
- Cognito client ID: `3gtbp1t96krpj6t9hfon4ljujn`

## Fitur Utama

- Autentikasi Amazon Cognito dengan alur login nyata
- Kontrol akses berbasis peran untuk `reporter`, `agent`, dan `admin`
- Fondasi profil akun dengan nama tampilan dan avatar yang dapat diperbarui
- Pengaturan akun dan alur kata sandi berbasis Amazon Cognito
- Pembuatan tiket, daftar tiket, detail tiket, komentar, dan pembaruan status
- Ownership tiket untuk kontrol akses mandiri
- Alur self-assignment untuk `agent` dan `admin`
- Activity log append-only pada halaman detail tiket
- Pencarian, filter, sorting, dan pagination di sisi server
- Lampiran S3 privat dengan alur presigned upload dan download
- Structured logging serta propagasi request ID untuk kebutuhan troubleshooting operasional
- Dokumentasi OpenAPI yang selaras dengan implementasi backend
- Cakupan pengujian backend dan frontend untuk alur utama

## Arsitektur

Komponen utama:

- `frontend/`: aplikasi React, Vite, dan TypeScript yang dideploy di Vercel
- `backend/`: aplikasi HTTP Go untuk eksekusi lokal dan deployment AWS Lambda berbasis container
- `infra/`: template AWS SAM dan konfigurasi deployment
- `docs/`: dokumentasi operasional, API, setup, dan arsitektur

Arsitektur runtime:

1. Pengguna mengakses frontend pada `https://opsdesk-teal.vercel.app`.
2. Frontend memanggil HTTP API pada `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`.
3. API Gateway meneruskan request ke backend Go yang berjalan di AWS Lambda sebagai container image.
4. Backend memvalidasi JWT Cognito, menerapkan RBAC, dan mengeksekusi alur kerja tiket.
5. Data tiket disimpan di DynamoDB dan objek lampiran disimpan di bucket S3 privat.
6. Structured log dan request ID mendukung troubleshooting melalui CloudWatch.

## Deployment

### Frontend

- Platform: Vercel
- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Domain production: `https://opsdesk-teal.vercel.app`

### Backend dan Infrastruktur

- Platform: AWS
- Infrastructure as Code: AWS SAM
- Model runtime: backend Go dideploy ke AWS Lambda sebagai container image
- Lapisan API: API Gateway HTTP API
- Layanan data dan identitas: DynamoDB, Amazon Cognito, Amazon S3
- Environment backend terdeploy: `dev`

Alur kerja infrastruktur yang umum dari `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

Deployment berikutnya:

```bash
sam build --template-file template.yaml
sam deploy --config-file samconfig.toml --resolve-image-repos
```

## Environment Variables

### Frontend

Buat `frontend/.env` berdasarkan [frontend/.env.example](./frontend/.env.example):

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
VITE_COGNITO_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

Environment variable frontend wajib diisi secara eksplisit. Aplikasi tidak mengandalkan fallback tersembunyi untuk konfigurasi API maupun Cognito.

### Backend

Backend membaca environment variable berikut:

- `APP_ENV`
- `API_BASE_PATH`
- `LOG_LEVEL`
- `TICKET_TABLE_NAME`
- `PROFILE_TABLE_NAME`
- `ATTACHMENT_BUCKET_NAME`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_APP_CLIENT_ID`

Untuk stack yang telah dideploy, nilai standarnya adalah:

```text
APP_ENV=dev
API_BASE_PATH=/v1
LOG_LEVEL=info
COGNITO_REGION=ap-southeast-1
COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
COGNITO_APP_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

`TICKET_TABLE_NAME`, `PROFILE_TABLE_NAME`, dan `ATTACHMENT_BUCKET_NAME` disediakan oleh stack SAM yang telah dideploy.

## Autentikasi dan Peran

Autentikasi diimplementasikan dengan Amazon Cognito. Frontend mengautentikasi pengguna terhadap user pool yang dikonfigurasi dan mengirim bearer token ke backend. Backend memvalidasi JWT dan menentukan otorisasi berdasarkan keanggotaan group Cognito.

Peran yang didukung:

- `reporter`: membuat tiket, melihat tiket milik sendiri, dan memberi komentar pada tiket milik sendiri
- `agent`: melihat tiket operasional, memperbarui status, memberi komentar, dan menugaskan tiket ke dirinya sendiri
- `admin`: akses operasional penuh, termasuk self-assignment

Kebijakan assignment saat ini sengaja dibatasi:

- belum ada direktori operator
- assignment ke pengguna lain belum diimplementasikan
- endpoint assignment menerapkan operator yang sedang terautentikasi

## Dokumentasi API

Kontrak API yang machine-readable tersedia di [docs/openapi.yaml](./docs/openapi.yaml). Referensi pendukung:

- [docs/api.md](./docs/api.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/setup.md](./docs/setup.md)
- [docs/usage-guide.md](./docs/usage-guide.md)
- [docs/operations.md](./docs/operations.md)

Endpoint HTTP yang tersedia mencakup:

- `GET /v1/health`
- `GET /v1/auth/me`
- `GET /v1/profile/me`
- `PATCH /v1/profile/me`
- `POST /v1/tickets`
- `GET /v1/tickets`
- `GET /v1/tickets/{id}`
- `PATCH /v1/tickets/{id}/status`
- `PATCH /v1/tickets/{id}/assignment`
- `GET /v1/tickets/{id}/activities`
- `POST /v1/tickets/{id}/comments`
- `POST /v1/tickets/{id}/attachments/upload-url`
- `POST /v1/tickets/{id}/attachments`
- `GET /v1/tickets/{id}/attachments/{attachmentId}/download`

## Batasan Saat Ini

- Assignment dibatasi pada operator yang sedang terautentikasi; assignment ke pengguna lain belum tersedia.
- Malware scanning lanjutan atau pemrosesan lampiran pascaupload belum diimplementasikan.
- Observability lanjutan seperti distributed tracing dan automated alerting belum disertakan.
- Fitur workflow enterprise seperti SLA automation dan notification pipeline berada di luar cakupan saat ini.
- Infrastruktur tetap dijaga ringkas dan belum mencakup custom domain, WAF, atau hardening produksi yang lebih luas.

## Lisensi

Proyek ini menggunakan lisensi MIT. Lihat [LICENSE](./LICENSE) untuk detail lengkap.
