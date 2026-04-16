# OpsDesk

OpsDesk adalah aplikasi helpdesk internal berbasis cloud untuk alur tiket operasional sederhana. Repository ini berisi frontend React + Vite + TypeScript yang dideploy ke Vercel, backend Go yang dideploy ke AWS Lambda container image, API Gateway HTTP API, DynamoDB, dan infrastruktur AWS SAM.

Batch ini merapikan baseline agar tidak lagi berorientasi demo. Fitur inti tetap sama, tetapi dokumentasi, konfigurasi deployment, dan placeholder login sekarang memakai framing yang lebih netral dan siap dipelihara.

## Deployment Tetap

- Frontend production: `https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`
- Backend environment: `dev`
- Backend API base URL: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`

## Cakupan Saat Ini

OpsDesk saat ini mendukung:

- dashboard ringkasan tiket
- daftar tiket
- pembuatan tiket
- detail tiket
- pembaruan status tiket
- komentar tiket
- health endpoint
- dokumentasi OpenAPI
- frontend smoke tests

## Batasan Yang Masih Berlaku

- autentikasi nyata belum diimplementasikan
- layar masuk masih memakai placeholder sesi internal
- belum ada RBAC, assignment, audit trail, attachment, atau observability lanjutan
- scope aplikasi tetap kecil agar arsitektur incremental dan mudah direview

## Arsitektur Singkat

- `frontend/`: React + Vite + TypeScript, dideploy ke Vercel
- `backend/`: Go HTTP application yang dipakai untuk local run dan Lambda entrypoint
- `infra/`: AWS SAM template untuk Lambda, API Gateway HTTP API, dan DynamoDB
- `docs/`: dokumentasi arsitektur, API, penggunaan, verifikasi, dan setup

Alur data:

1. Frontend memanggil backend melalui API Gateway HTTP API.
2. Backend Go memproses request dan validasi.
3. Data tiket disimpan di DynamoDB.
4. Respons JSON dikembalikan ke frontend.

## Dokumen Utama

Urutan paling cepat untuk memahami proyek:

1. Baca [docs/usage-guide.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/usage-guide.md) untuk alur penggunaan aplikasi.
2. Baca [docs/release-checklist.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/release-checklist.md) untuk verifikasi rilis dan deployment.
3. Baca [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md) atau [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml) untuk kontrak API.
4. Baca [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md) untuk run lokal dan deploy.

## Menjalankan Frontend

Masuk ke folder `frontend/`:

```bash
npm install
npm run dev
npm run test
```

Buat `frontend/.env` dari [frontend/.env.example](/d:/Semester%206/Cloud%20Computing/opsdesk/frontend/.env.example), lalu isi `VITE_API_BASE_URL` secara eksplisit. Repository ini mencontohkan API deployment aktif:

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
```

Frontend tidak lagi memakai fallback diam-diam ke `localhost`, jadi environment variable harus selalu diset dengan jelas.

## Menjalankan Backend

Masuk ke folder `backend/`:

```bash
go test ./...
go run ./cmd/local
```

Untuk local run, backend tetap memakai base path:

```text
http://localhost:8080/v1
```

Backend membutuhkan `TICKET_TABLE_NAME` yang mengarah ke tabel DynamoDB yang dapat diakses. Saat dideploy melalui SAM, nilai ini di-wire otomatis oleh stack.

## Deploy Backend Dengan AWS SAM

Masuk ke folder `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

Parameter deploy default repository ini sudah distandarkan ke:

```text
ProjectName=opsdesk
StageName=dev
AppEnv=dev
ApiBasePath=/v1
FrontendOrigin=https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app
LogLevel=info
```

Output stack yang paling penting:

- `HttpApiUrl`
- `ApiBaseUrl`
- `SuggestedHealthEndpoint`
- `TicketsTableName`

## Deploy Frontend Ke Vercel

Konfigurasi yang dipakai:

- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Environment variable yang harus dipasang di Vercel:

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
```

Frontend production yang ditetapkan untuk repository ini adalah:

```text
https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app
```

## Endpoint Yang Tersedia

- `GET /v1/health`
- `POST /v1/tickets`
- `GET /v1/tickets`
- `GET /v1/tickets/{id}`
- `PATCH /v1/tickets/{id}/status`
- `POST /v1/tickets/{id}/comments`

## Catatan Batch 1

Batch ini hanya mencakup cleanup baseline production-oriented:

- wording demo diganti menjadi wording netral
- dokumen demo/reviewer diganti menjadi panduan penggunaan dan checklist rilis
- domain frontend final dan API base URL final distandarkan
- konfigurasi CORS diarahkan ke frontend final saja
- fallback frontend ke `localhost` dihapus

Yang sengaja belum dikerjakan:

- autentikasi nyata
- RBAC
- assignment tiket
- audit trail
- attachment
- observability lanjutan

## Dokumentasi Tambahan

- [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md)
- [docs/architecture.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/architecture.md)
- [docs/usage-guide.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/usage-guide.md)
- [docs/release-checklist.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/release-checklist.md)
- [docs/roadmap.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/roadmap.md)
- [docs/screenshots/README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/screenshots/README.md)
