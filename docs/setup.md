# Setup and Deployment

## Deployment Constants

Dokumen ini mengikuti konstanta deployment tetap untuk repository ini:

- Frontend production: `https://opsdesk-teal.vercel.app`
- Backend environment: `dev`
- Backend API base URL: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`

## Frontend Environment

Lokasi file:

- `frontend/.env`

Environment variable yang dipakai frontend:

- `VITE_API_BASE_URL`
- `VITE_COGNITO_REGION`
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`

Nilai yang distandarkan untuk deployment aktif:

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
VITE_COGNITO_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

Catatan:

- Frontend tidak lagi memiliki fallback otomatis ke `localhost`.
- Untuk run lokal, isi `VITE_API_BASE_URL` secara eksplisit sesuai backend yang sedang dipakai.
- Jangan arahkan verifikasi utama ke preview domain, karena CORS backend dikunci ke domain production final.

## Backend Runtime Environment

Backend membaca environment variable berikut:

- `APP_ENV`
- `API_BASE_PATH`
- `LOG_LEVEL`
- `TICKET_TABLE_NAME`
- `ATTACHMENT_BUCKET_NAME`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_APP_CLIENT_ID`

Nilai deploy yang dipakai repository ini:

```text
APP_ENV=dev
API_BASE_PATH=/v1
LOG_LEVEL=info
```

`TICKET_TABLE_NAME`, `ATTACHMENT_BUCKET_NAME`, `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, dan `COGNITO_APP_CLIENT_ID` diisi otomatis oleh stack SAM saat deploy.

## Local Backend Run

Dari folder `backend/`:

```bash
go test ./...
go run ./cmd/local
```

Base URL lokal:

```text
http://localhost:8080/v1
```

## Local Frontend Run

Dari folder `frontend/`:

```bash
npm install
npm run dev
npm run test
```

Contoh `.env` lokal jika frontend ingin diarahkan ke backend lokal:

```text
VITE_API_BASE_URL=http://localhost:8080/v1
```

## AWS SAM Parameters

Template SAM memakai parameter berikut:

- `ProjectName`
- `StageName`
- `AppEnv`
- `ApiBasePath`
- `FrontendOrigin`
- `LogLevel`

Nilai yang sudah distandarkan untuk repository ini:

```text
ProjectName=opsdesk
StageName=dev
AppEnv=dev
ApiBasePath=/v1
FrontendOrigin=https://opsdesk-teal.vercel.app
LogLevel=info
```

CORS harus tetap menunjuk hanya ke frontend production final di atas.

## Cognito Setup Minimum

Batch ini membuat resource Cognito langsung di SAM:

- satu User Pool
- satu public app client untuk login frontend
- tiga group role:
  - `reporter`
  - `agent`
  - `admin`

Flow yang diharapkan:

1. Deploy stack SAM.
2. Ambil output `CognitoUserPoolId` dan `CognitoUserPoolClientId`.
3. Pasang keduanya ke environment variable frontend di Vercel.
4. Buat user internal pertama di Cognito menggunakan AWS Console atau AWS CLI.
5. Tambahkan user ke salah satu group RBAC yang sesuai.

Contoh CLI untuk membuat user internal:

```bash
aws cognito-idp admin-create-user --user-pool-id <user-pool-id> --username nama@perusahaan.com --user-attributes Name=email,Value=nama@perusahaan.com Name=email_verified,Value=true --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id <user-pool-id> --username nama@perusahaan.com --password '<PasswordAwal123>' --permanent
aws cognito-idp admin-add-user-to-group --user-pool-id <user-pool-id> --username nama@perusahaan.com --group-name reporter
```

Role yang didukung:

- `reporter`: buat tiket, lihat tiket milik sendiri, detail tiket milik sendiri, komentar pada tiket milik sendiri
- `agent`: lihat tiket operasional, ubah status, tambah komentar, dan ambil assignment tiket ke dirinya sendiri
- `admin`: full access, termasuk assignment tiket ke dirinya sendiri

Catatan ownership dan assignment:

- tiket baru yang dibuat pelapor akan menyimpan owner dari identitas Cognito yang sedang login
- tiket lama tanpa field ownership baru tetap dibaca dengan fallback ke `reporterEmail`
- batch ini belum membuat direktori operator, sehingga assignment masih memakai pola sederhana "Tugaskan ke Saya"

## Build and Deploy Backend

Dari folder `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

Deploy berikutnya:

```bash
sam build --template-file template.yaml
sam deploy --config-file samconfig.toml --resolve-image-repos
```

Lambda dibangun sebagai container image dari `backend/Dockerfile.lambda`, jadi Docker harus aktif saat `sam build`.

## Verify Final Deployment Assumptions

Pastikan asumsi berikut benar sebelum rilis:

1. Frontend production tetap `https://opsdesk-teal.vercel.app`
2. Backend tetap environment `dev`
3. API base URL tetap `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
4. SAM parameter `FrontendOrigin` masih sama dengan domain frontend final
5. Tidak ada dokumen utama yang mengarahkan reviewer ke preview domain
6. Environment variable frontend di Vercel cocok dengan output stack Cognito terbaru

## Verify Deployed Backend

Contoh verifikasi:

```bash
curl https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health
curl -H "Authorization: Bearer <id-token>" https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/auth/me
```

Output stack yang penting:

- `HttpApiUrl`
- `ApiBaseUrl`
- `SuggestedHealthEndpoint`
- `TicketsTableName`
- `CognitoUserPoolId`
- `CognitoUserPoolClientId`
- `CognitoIssuerUrl`

## Vercel Frontend Deployment

Setting yang digunakan:

- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Environment variable yang wajib di Vercel:

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
VITE_COGNITO_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

Karena backend CORS dikunci ke domain production final, jangan arahkan verifikasi utama ke preview domain.

## Catatan

Dokumen ini berfokus pada setup dan deployment yang sesuai dengan sistem yang saat ini diterapkan. Untuk ringkasan presentasi repository, gunakan [README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/README.md).
