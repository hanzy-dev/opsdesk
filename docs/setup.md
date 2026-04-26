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

Flow akun Cognito yang digunakan frontend pada batch ini:

- login dengan `USER_PASSWORD_AUTH`
- refresh token session
- forgot password melalui email verifikasi
- konfirmasi reset password
- change password untuk pengguna yang sedang login

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
- `PROFILE_TABLE_NAME`
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

`TICKET_TABLE_NAME`, `PROFILE_TABLE_NAME`, `ATTACHMENT_BUCKET_NAME`, `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, dan `COGNITO_APP_CLIENT_ID` diisi otomatis oleh stack SAM saat deploy.

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
- `EnableDynamoPointInTimeRecovery`

Nilai yang sudah distandarkan untuk repository ini:

```text
ProjectName=opsdesk
StageName=dev
AppEnv=dev
ApiBasePath=/v1
FrontendOrigin=https://opsdesk-teal.vercel.app
LogLevel=info
EnableDynamoPointInTimeRecovery=true
```

CORS harus tetap menunjuk hanya ke frontend production final di atas.
`EnableDynamoPointInTimeRecovery=true` memberi perlindungan pemulihan data dasar untuk tabel tiket dan profil. Untuk stack eksperimen yang sangat sementara, parameter ini dapat dibuat `false` agar biaya backup DynamoDB tidak aktif.

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
- `agent`: lihat tiket operasional, ubah status, tambah komentar, dan mengelola assignment tiket
- `admin`: full access, termasuk membuat tiket dan mengelola assignment tiket

Catatan ownership dan assignment:

- tiket baru yang dibuat pelapor akan menyimpan owner dari identitas Cognito yang sedang login
- tiket lama tanpa field ownership baru tetap dibaca dengan fallback ke `reporterEmail`
- daftar assignable users dibaca dari tabel profil DynamoDB dan hanya memuat profil dengan role tersimpan `agent` atau `admin`
- untuk user baru, login pertama akan membantu membuat record profil awal
- untuk user yang role Cognito-nya baru berubah, lakukan sinkronisasi profil sekali lagi agar daftar assignable mengikuti role terbaru

## Build and Deploy Backend

Frontend dan backend OpsDesk dirilis lewat jalur berbeda. Frontend production dideploy oleh Vercel dari folder `frontend`, sedangkan backend AWS dan infrastrukturnya dideploy manual lewat AWS SAM dari folder `infra`.

Readiness check atau CI yang menjalankan `sam validate` dan `sam build` hanya membuktikan template serta image backend siap dibangun. Check tersebut tidak memperbarui Lambda live kecuali workflow secara eksplisit menjalankan `sam deploy`. Setelah perubahan backend atau infrastruktur, developer tetap harus menjalankan `sam build` dan `sam deploy`.

Dari folder `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml --no-cached
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

Deploy berikutnya:

```bash
sam build --template-file template.yaml --no-cached
sam deploy --template-file .aws-sam\build\template.yaml --config-file samconfig.toml --stack-name opsdesk-dev --region ap-southeast-1 --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --resolve-s3 --resolve-image-repos
```

Lambda dibangun sebagai container image dari `backend/Dockerfile.lambda`, jadi Docker harus aktif saat `sam build`.

Aturan release praktis:

- frontend-only change: tunggu deployment Vercel dan verifikasi UI production
- backend code change: jalankan `go test ./...`, `sam build`, `sam deploy`, lalu verifikasi live API
- infra/template change: jalankan `sam validate`, `sam build`, `sam deploy`, lalu cek output stack
- OpenAPI/docs change: jalankan build frontend bila Swagger UI mengonsumsi file OpenAPI
- endpoint yang ditambahkan ke frontend atau OpenAPI harus sudah tersedia di backend live sebelum dianggap rilis

## Verify Final Deployment Assumptions

Pastikan asumsi berikut benar sebelum rilis:

1. Frontend production tetap `https://opsdesk-teal.vercel.app`
2. Backend tetap environment `dev`
3. API base URL tetap `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
4. SAM parameter `FrontendOrigin` masih sama dengan domain frontend final
5. Tidak ada dokumen utama yang mengarahkan reviewer ke preview domain
6. Environment variable frontend di Vercel cocok dengan output stack Cognito terbaru

Untuk verifikasi pasca-deploy yang lebih praktis, gunakan bagian [Smoke Test Setelah Deploy](./release-checklist.md#smoke-test-setelah-deploy) pada release checklist.

## Verify Deployed Backend

Contoh verifikasi:

```bash
curl -i https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health
curl -i "https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/notifications?limit=12"
curl -H "Authorization: Bearer <id-token>" https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/auth/me
curl -H "Authorization: Bearer <id-token>" https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/profile/me
```

`/health` seharusnya mengembalikan `200`. `GET /notifications?limit=12` tanpa token seharusnya mengembalikan `401`, bukan `404`; jika masih `404`, kemungkinan frontend/OpenAPI sudah lebih baru daripada Lambda live.

Output stack yang penting:

- `HttpApiUrl`
- `ApiBaseUrl`
- `SuggestedHealthEndpoint`
- `TicketsTableName`
- `ProfilesTableName`
- `AttachmentsBucketName`
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

Setelah frontend-only change, deployment Vercel dan verifikasi UI biasanya cukup. Setelah perubahan OpenAPI yang dirender oleh Swagger UI, jalankan:

```bash
npm test -- --run
npm run build
```

Lalu cek `https://opsdesk-teal.vercel.app/api-docs` setelah deployment Vercel selesai.

## Catatan

Dokumen ini berfokus pada setup dan deployment yang sesuai dengan sistem yang saat ini diterapkan. Untuk ringkasan presentasi repository, gunakan [README.md](../README.md).
