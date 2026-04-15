# OpsDesk

OpsDesk adalah aplikasi helpdesk dan incident ticketing serverless yang dibuat untuk tugas mata kuliah cloud computing, sekaligus dipoles agar layak tampil sebagai proyek portofolio GitHub.

Fokus proyek ini adalah menunjukkan implementasi full-stack yang rapi, realistis, dan mudah direview: frontend modern, backend Go, arsitektur serverless di AWS, dokumentasi API OpenAPI, serta workflow CI yang ringan.

## Ringkasan Proyek

Dalam banyak tugas akademik, aplikasi sering selesai di level CRUD lokal tanpa konteks deployment cloud yang jelas. OpsDesk menyelesaikan masalah itu dengan contoh aplikasi helpdesk sederhana yang:

- memiliki alur tiket yang nyata dan mudah dipahami
- berjalan pada arsitektur serverless yang relevan untuk pembelajaran cloud
- tetap cukup kecil untuk direview cepat oleh dosen atau recruiter

## Masalah Yang Diselesaikan

OpsDesk memodelkan kebutuhan dasar operasional support:

- mencatat tiket insiden atau permintaan bantuan
- memantau status tiket
- menambahkan komentar progres penanganan
- memisahkan frontend, backend, dan infrastruktur dengan struktur monorepo yang jelas

## Fitur Utama

- dashboard frontend untuk melihat ringkasan tiket
- daftar tiket dan detail tiket
- pembuatan tiket baru
- pembaruan status tiket
- penambahan komentar pada tiket
- backend Go dengan API HTTP yang terdokumentasi
- persistence menggunakan DynamoDB
- deployment backend berbasis AWS Lambda + API Gateway HTTP API
- dokumentasi OpenAPI untuk inspeksi API
- workflow GitHub Actions ringan untuk test/build backend dan readiness SAM

## Arsitektur Singkat

Arsitektur OpsDesk saat ini:

- `frontend/`: React + Vite + TypeScript
- `backend/`: Go application dengan router HTTP yang dipakai untuk local server dan Lambda adapter
- `infra/`: AWS SAM template untuk Lambda, API Gateway HTTP API, dan DynamoDB
- `docs/`: dokumentasi arsitektur, API, setup, dan roadmap

Alur data singkat:

1. Frontend memanggil backend melalui HTTP API.
2. Backend memproses request di Go.
3. Data tiket disimpan di DynamoDB.
4. Backend mengembalikan respons JSON yang konsisten ke frontend.

## Teknologi Yang Digunakan

- React
- Vite
- TypeScript
- Go
- AWS Lambda
- API Gateway HTTP API
- DynamoDB
- AWS SAM
- GitHub Actions
- OpenAPI 3

## Struktur Repository

- `frontend/` aplikasi client React + Vite + TypeScript
- `backend/` aplikasi backend Go dan entrypoint Lambda/local
- `infra/` template AWS SAM dan file pendukung deployment
- `docs/` dokumentasi API, setup, arsitektur, dan roadmap
- `.github/workflows/` workflow CI/CD ringan berbasis GitHub Actions

## Cara Menjalankan Frontend

Masuk ke folder `frontend/`, lalu:

```bash
npm install
npm run dev
```

Buat file `.env` berdasarkan `frontend/.env.example`:

```text
VITE_API_BASE_URL=http://localhost:8080/v1
```

## Cara Menjalankan Backend

Masuk ke folder `backend/`, lalu:

```bash
go test ./...
go run ./cmd/local
```

Contoh base URL backend lokal:

```text
http://localhost:8080/v1
```

Backend saat ini membutuhkan `TICKET_TABLE_NAME` yang mengarah ke tabel DynamoDB yang dapat diakses.

Saat dideploy ke AWS melalui SAM, nilai `TICKET_TABLE_NAME` di-wire otomatis oleh stack.

## Cara Deploy Backend Dengan SAM

Masuk ke folder `infra/`, lalu:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

Batch deployment ini memakai Lambda container image yang dibangun dari `backend/Dockerfile.lambda`, jadi Docker Desktop perlu aktif saat menjalankan `sam build`.

Parameter deploy utama sudah dicontohkan di:

- [infra/template.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/infra/template.yaml)
- [infra/samconfig.toml](/d:/Semester%206/Cloud%20Computing/opsdesk/infra/samconfig.toml)
- [infra/samconfig.example.toml](/d:/Semester%206/Cloud%20Computing/opsdesk/infra/samconfig.example.toml)

Output stack yang paling penting setelah deploy:

- `HttpApiUrl`
- `ApiBaseUrl`
- `SuggestedHealthEndpoint`
- `TicketsTableName`

## Cara Menyiapkan Frontend Untuk Vercel

Frontend sudah disiapkan agar mudah dihubungkan ke Vercel berbasis GitHub.

Konfigurasi yang direkomendasikan:

- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Environment variable yang dibutuhkan di Vercel:

```text
VITE_API_BASE_URL=https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/dev/v1
```

## Ringkasan Endpoint API

Endpoint backend saat ini:

- `GET /v1/health`
- `POST /v1/tickets`
- `GET /v1/tickets`
- `GET /v1/tickets/{id}`
- `PATCH /v1/tickets/{id}/status`
- `POST /v1/tickets/{id}/comments`

## Lokasi Dokumentasi OpenAPI

Dokumentasi API tersedia di:

- [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml)
- [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md)

## Alur Review Cepat Untuk Dosen

Urutan review yang disarankan:

1. Baca [docs/reviewer-checklist.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/reviewer-checklist.md)
2. Lihat [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md) dan [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml)
3. Lihat [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md) untuk setup dan deployment
4. Tinjau struktur `frontend/`, `backend/`, dan `infra/`
5. Jika perlu, jalankan frontend dan backend secara lokal

## Keputusan Teknis Utama

- memilih serverless AWS agar sesuai konteks mata kuliah cloud computing
- menggunakan Go di backend untuk implementasi yang ringkas dan performa baik di Lambda
- menggunakan API Gateway HTTP API agar biaya dan kompleksitas lebih rendah dibanding REST API klasik
- menggunakan DynamoDB dengan model data sederhana agar mudah dipahami reviewer
- menggunakan React + Vite + TypeScript untuk frontend modern yang tetap ringan
- menambahkan OpenAPI agar kontrak API mudah diinspeksi tanpa membaca kode backend terlebih dahulu
- menjaga CI sederhana dengan GitHub Actions yang fokus pada test, build, dan readiness check

## Known Limitations / Batasan Saat Ini

- autentikasi belum diimplementasikan; halaman login masih berupa demo UI
- belum ada upload file atau attachment
- belum ada observability lanjutan seperti alarm, dashboard metrik, atau tracing mendalam
- filtering dan pencarian tiket di frontend masih sederhana
- deployment frontend ke Vercel sudah siap secara struktur, tetapi belum dilengkapi file konfigurasi khusus karena belum benar-benar dibutuhkan
- proyek ini sengaja menjaga scope tetap kecil agar fokus pada kualitas implementasi inti

## Dokumentasi Tambahan

- [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md)
- [docs/architecture.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/architecture.md)
- [docs/roadmap.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/roadmap.md)
- [docs/demo-guide.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/demo-guide.md)
