# OpsDesk

OpsDesk adalah aplikasi helpdesk internal kecil yang production-oriented. Repository ini berisi frontend React + Vite + TypeScript di Vercel, backend Go di AWS Lambda container image, API Gateway HTTP API, DynamoDB, Amazon Cognito, Amazon S3 untuk lampiran, dan infrastruktur AWS SAM.

## Deployment Tetap

- Frontend production: `https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`
- Backend environment: `dev`
- Backend API base URL: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`

## Fitur Saat Ini

- login nyata dengan Amazon Cognito
- RBAC sederhana berbasis group Cognito `reporter`, `agent`, dan `admin`
- dashboard ringkasan tiket
- daftar tiket
- detail tiket
- pembuatan tiket
- ownership tiket berbasis identitas login
- assignment sederhana dengan pola "Tugaskan ke Saya"
- audit trail aktivitas tiket
- pencarian, filter, sorting, dan pagination di sisi server
- lampiran tiket aman dengan presigned URL S3
- pembaruan status tiket
- komentar tiket
- health endpoint
- endpoint `/v1/auth/me`
- dokumentasi OpenAPI yang mengikuti implementasi
- backend tests dan frontend tests yang fokus pada flow penting

## Arsitektur Singkat

- `frontend/`: React + Vite + TypeScript, deployed ke Vercel
- `backend/`: aplikasi Go HTTP untuk local run dan Lambda
- `infra/`: AWS SAM template dan konfigurasi deploy
- `docs/`: dokumentasi penggunaan, arsitektur, API, operasi, dan checklist rilis

Alur request:

1. Pengguna membuka frontend production di Vercel.
2. Frontend memanggil backend melalui API Gateway HTTP API.
3. Adapter Lambda meneruskan request ke router HTTP Go.
4. Backend memverifikasi JWT Cognito, menjalankan RBAC, lalu memproses handler dan service.
5. Ticket disimpan di DynamoDB, dan file lampiran memakai S3 private dengan presigned URL.
6. Structured log dan request ID dikirim ke CloudWatch untuk troubleshooting.

## Auth, RBAC, dan Assignment

- `reporter`: membuat tiket, melihat tiket milik sendiri, memberi komentar pada tiket milik sendiri
- `agent`: melihat tiket operasional, mengubah status, memberi komentar, dan mengambil assignment ke dirinya sendiri
- `admin`: akses penuh operasional, termasuk assignment ke dirinya sendiri

Kebijakan assignment sengaja tetap sederhana:

- belum ada direktori operator
- belum ada assign ke pengguna lain lewat UI atau API
- endpoint assignment saat ini memakai operator yang sedang login

## Observability Dasar

- backend menulis structured log JSON yang ramah CloudWatch
- setiap request memiliki `X-Request-Id`
- body error backend menyertakan `error.requestId`
- frontend menampilkan `Kode referensi` saat request ID tersedia
- log utama ada di CloudWatch:
  - `/aws/lambda/<BackendFunctionName>`
  - `/aws/apigateway/opsdesk-dev-http-api`

Panduan operasional ringkas ada di [docs/operations.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/operations.md).

## Menjalankan Frontend

Masuk ke folder `frontend/`:

```bash
npm install
npm run dev
npm run test
npm run build
```

Buat `frontend/.env` dari [frontend/.env.example](/d:/Semester%206/Cloud%20Computing/opsdesk/frontend/.env.example) lalu isi:

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=<stack-output-cognito-user-pool-id>
VITE_COGNITO_CLIENT_ID=<stack-output-cognito-user-pool-client-id>
```

Frontend tidak punya fallback diam-diam untuk API atau Cognito, jadi semua environment variable harus diisi eksplisit.

## Menjalankan Backend

Masuk ke folder `backend/`:

```bash
go test ./...
go run ./cmd/local
```

Base URL lokal:

```text
http://localhost:8080/v1
```

Untuk local run, backend tetap membutuhkan:

- `TICKET_TABLE_NAME`
- `ATTACHMENT_BUCKET_NAME`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_APP_CLIENT_ID`

Nilai-nilai tersebut diisi otomatis oleh stack SAM saat deploy AWS.

## Deploy Dengan AWS SAM

Dari folder `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

Parameter deploy yang distandarkan:

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
- `BackendFunctionName`
- `SuggestedHealthEndpoint`
- `TicketsTableName`
- `AttachmentsBucketName`
- `CognitoUserPoolId`
- `CognitoUserPoolClientId`
- `CognitoIssuerUrl`

## Deploy Frontend Ke Vercel

Setting Vercel:

- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Environment variable di Vercel:

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=<stack-output-cognito-user-pool-id>
VITE_COGNITO_CLIENT_ID=<stack-output-cognito-user-pool-client-id>
```

Karena backend CORS dikunci ke domain production final, verifikasi utama harus selalu memakai domain tetap berikut:

```text
https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app
```

## Endpoint Yang Tersedia

- `GET /v1/health`
- `GET /v1/auth/me`
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

## Batasan Yang Sengaja Dipertahankan

- belum ada malware scanning atau pemrosesan file lanjutan
- belum ada distributed tracing atau observability lanjutan
- belum ada assignment ke operator lain
- belum ada email notification, SLA automation, atau workflow enterprise
- scope aplikasi tetap kecil agar mudah dirawat dan direview

## Dokumen Utama

1. [docs/usage-guide.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/usage-guide.md)
2. [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md)
3. [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md)
4. [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml)
5. [docs/operations.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/operations.md)
6. [docs/release-checklist.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/release-checklist.md)
7. [docs/architecture.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/architecture.md)
