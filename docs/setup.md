# Setup and Deployment

## Deployment Constants

Dokumen ini mengikuti konstanta deployment tetap untuk repository ini:

- Frontend production: `https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`
- Backend environment: `dev`
- Backend API base URL: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`

## Frontend Environment

Lokasi file:

- `frontend/.env`

Variable yang dipakai:

- `VITE_API_BASE_URL`

Nilai yang distandarkan untuk deployment aktif:

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
```

Catatan:

- Frontend tidak lagi memiliki fallback otomatis ke `localhost`.
- Untuk run lokal, isi `VITE_API_BASE_URL` secara eksplisit sesuai backend yang sedang dipakai.

## Backend Runtime Environment

Backend membaca environment variable berikut:

- `APP_ENV`
- `API_BASE_PATH`
- `LOG_LEVEL`
- `TICKET_TABLE_NAME`

Nilai deploy yang dipakai repository ini:

```text
APP_ENV=dev
API_BASE_PATH=/v1
LOG_LEVEL=info
```

`TICKET_TABLE_NAME` diisi otomatis oleh stack SAM saat deploy.

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
FrontendOrigin=https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app
LogLevel=info
```

CORS harus tetap menunjuk hanya ke frontend production di atas.

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

Lambda dibangun sebagai container image dari `backend/Dockerfile.lambda`, jadi Docker perlu aktif saat `sam build`.

## Verify Deployed Backend

Contoh verifikasi:

```bash
curl https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health
curl https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/tickets
```

Output stack yang penting:

- `HttpApiUrl`
- `ApiBaseUrl`
- `SuggestedHealthEndpoint`
- `TicketsTableName`

## Vercel Frontend Deployment

Setting yang digunakan:

- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Environment variable yang wajib di Vercel:

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
```

Karena backend CORS dikunci ke domain production final, jangan arahkan deployment ini ke preview domain untuk verifikasi utama batch ini.

## Release Notes For This Batch

Batch ini hanya membersihkan baseline deployment:

- wording demo diganti dengan wording penggunaan internal
- placeholder login tetap ada, tetapi belum menjadi autentikasi nyata
- CORS dan env deployment diarahkan ke domain final saja
- dokumentasi kini memakai URL frontend dan API aktif
