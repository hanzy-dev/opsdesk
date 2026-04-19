# OpsDesk

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TypeScript-3178C6)](./frontend)
[![Backend](https://img.shields.io/badge/Backend-Go-00ADD8)](./backend)
[![AWS Stack](https://img.shields.io/badge/AWS-Lambda%20%7C%20API%20Gateway%20%7C%20DynamoDB%20%7C%20Cognito%20%7C%20S3-FF9900)](./infra)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%2B%20AWS%20SAM-111111)](./docs/setup.md)
[![Status: Production-Oriented](https://img.shields.io/badge/Status-Production--Oriented-0A7F5A)](./README.md)

OpsDesk adalah aplikasi helpdesk dan ticketing internal berbasis cloud yang dirancang untuk alur operasional yang ringkas, terkontrol, dan mudah dipresentasikan. Repository ini memuat frontend React, backend Go, infrastruktur AWS SAM, serta dokumentasi operator yang mengikuti perilaku sistem saat ini.

## Ringkasan Proyek

OpsDesk menangani kebutuhan inti helpdesk internal: autentikasi, pembagian peran, pembuatan tiket, triase, penugasan, komentar, lampiran, audit trail, serta tampilan dashboard operasional yang cukup kuat untuk demo teknis maupun evaluasi produk.

Nilai yang menonjol dari implementasi ini:

- arsitektur cloud yang nyata dan terdeploy
- pemisahan frontend, backend, dan infrastruktur yang jelas
- RBAC berbasis Cognito group
- audit trail tiket yang konsisten
- penugasan tiket ke diri sendiri maupun operator lain yang berwenang
- dokumentasi API interaktif dan panduan operator yang praktis

## Link Deployment

- Frontend: `https://opsdesk-teal.vercel.app`
- Backend API: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- API docs: `https://opsdesk-teal.vercel.app/api-docs`
- Region AWS utama: `ap-southeast-1`
- Stack SAM aktif: `opsdesk-dev`

Konstanta Cognito yang digunakan deployment aktif:

- User Pool ID: `ap-southeast-1_sMFqei7IT`
- App Client ID: `3gtbp1t96krpj6t9hfon4ljujn`

## Masalah yang Diselesaikan

OpsDesk ditujukan untuk skenario dukungan operasional internal yang membutuhkan:

- kanal tunggal untuk pelaporan isu
- pemisahan wewenang antara pelapor, petugas, dan admin
- visibilitas status tiket dan penanggung jawab
- riwayat perubahan yang bisa ditelusuri
- lampiran yang tidak terbuka ke publik
- deployment yang realistis dan mudah diaudit

## Sorotan Fitur

- Login Amazon Cognito dengan sesi JWT dan refresh token
- RBAC untuk `reporter`, `agent`, dan `admin`
- Dashboard operasional dengan kartu metrik, tiket terbaru, aktivitas terbaru, dan quick actions
- Daftar tiket dengan pencarian, filter, sorting, dan pagination di sisi server
- Halaman detail tiket dengan komentar, lampiran, status, penugasan, dan timeline aktivitas
- Penugasan tiket ke diri sendiri atau ke operator lain yang eligible
- Profil akun dan pengaturan akun terpisah
- Forgot password, reset password, dan change password berbasis Cognito
- Dokumentasi OpenAPI yang terhubung ke viewer Swagger UI
- Pengujian backend dan frontend untuk alur utama

## Peran yang Didukung

Peran aplikasi diturunkan dari Cognito User Pool Group:

- `reporter`: membuat tiket, melihat tiket milik sendiri, dan menambahkan komentar pada tiket yang dapat diaksesnya
- `agent`: melihat tiket operasional, memperbarui status, menambahkan komentar, dan mengelola penugasan tiket
- `admin`: akses operasional penuh, termasuk membuat tiket dan mengelola penugasan

Urutan prioritas role mengikuti grup Cognito:

- `admin` mengungguli `agent`
- `agent` mengungguli `reporter`
- jika tidak ada grup yang cocok, sistem memperlakukan akun sebagai `reporter`

## Arsitektur Singkat

Alur runtime aplikasi:

1. Pengguna mengakses frontend Vite di Vercel.
2. Frontend melakukan autentikasi langsung ke Cognito dan menyimpan sesi JWT.
3. Frontend memanggil backend HTTP API di API Gateway dengan bearer token.
4. Backend Go di AWS Lambda memverifikasi JWT Cognito, menyelesaikan role, lalu menerapkan RBAC.
5. Data tiket dan profil disimpan di DynamoDB.
6. Lampiran diunggah ke bucket S3 privat melalui presigned URL.
7. Log request dan request ID dikirim ke CloudWatch untuk troubleshooting.

Komponen utama repository:

- `frontend/`: React + Vite + TypeScript
- `backend/`: layanan HTTP Go untuk Lambda dan run lokal
- `infra/`: AWS SAM template dan konfigurasi deploy
- `docs/`: dokumentasi API, setup, operator guide, dan alur demo

## Stack Teknologi

- Frontend: React, Vite, TypeScript, React Router
- Backend: Go
- API: AWS API Gateway HTTP API
- Compute: AWS Lambda container image
- Database: DynamoDB
- Auth: Amazon Cognito
- Storage: Amazon S3
- Infrastructure as Code: AWS SAM
- Hosting frontend: Vercel

## Ringkasan Alur Aplikasi

Alur penggunaan inti di deployment aktif:

1. Pengguna login dengan akun Cognito.
2. Reporter atau admin membuat tiket baru.
3. Petugas atau admin meninjau tiket melalui dashboard dan halaman daftar tiket.
4. Tiket ditugaskan ke petugas yang relevan.
5. Status, komentar, dan lampiran diperbarui dari halaman detail tiket.
6. Timeline aktivitas mencatat perubahan penting secara append-only.

## Fitur yang Sudah Tersedia

- Cognito auth dengan login, refresh session, logout global, forgot password, reset password, dan change password
- Dashboard operasional yang lebih hidup untuk monitoring tiket
- `/tickets/assigned` dan tampilan "Ditugaskan ke Saya"
- assignment ke operator lain yang berwenang
- profile persistence di DynamoDB
- daftar user assignable untuk agent/admin
- upload dan download lampiran S3 privat
- API docs viewer di frontend

## Menjalankan Secara Lokal

### Backend

Dari folder `backend/`:

```bash
go test ./...
go run ./cmd/local
```

Base URL lokal:

```text
http://localhost:8080/v1
```

### Frontend

Dari folder `frontend/`:

```bash
npm install
npm run dev
npm test -- --run
npm run build
```

Buat `frontend/.env` berdasarkan [frontend/.env.example](./frontend/.env.example). Contoh jika frontend diarahkan ke backend lokal:

```text
VITE_API_BASE_URL=http://localhost:8080/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
VITE_COGNITO_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

Jika ingin menguji deployment aktif, gunakan nilai production yang sama dengan `.env.example`.

## Ringkasan Deployment dan Infrastruktur

Parameter SAM yang digunakan pada konfigurasi default:

- `ProjectName=opsdesk`
- `StageName=dev`
- `AppEnv=dev`
- `ApiBasePath=/v1`
- `FrontendOrigin=https://opsdesk-teal.vercel.app`
- `LogLevel=info`

Resource penting yang dapat diturunkan langsung dari template:

- User Pool name: `opsdesk-dev-users`
- User Pool groups: `reporter`, `agent`, `admin`
- Tickets table: `opsdesk-dev-tickets`
- Profiles table: `opsdesk-dev-profiles`
- Attachment bucket: `opsdesk-dev-attachments-<AWS_ACCOUNT_ID>`

Perintah deploy dari folder `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --config-file samconfig.toml --resolve-image-repos
```

## Dokumentasi Tambahan

- Operator guide: [docs/operator-guide.md](./docs/operator-guide.md)
- Demo flow: [docs/demo-guide.md](./docs/demo-guide.md)
- Portfolio pack: [docs/portfolio-pack.md](./docs/portfolio-pack.md)
- Project summary: [docs/project-summary.md](./docs/project-summary.md)
- CV dan LinkedIn bullets: [docs/cv-linkedin-bullets.md](./docs/cv-linkedin-bullets.md)
- Presentation script: [docs/presentation-script.md](./docs/presentation-script.md)
- Setup dan deployment: [docs/setup.md](./docs/setup.md)
- Usage guide: [docs/usage-guide.md](./docs/usage-guide.md)
- API reference: [docs/api.md](./docs/api.md)
- OpenAPI YAML: [docs/openapi.yaml](./docs/openapi.yaml)

## Ringkasan Demo 3-5 Menit

Alur demo singkat yang aman untuk dosen atau recruiter:

1. Login ke aplikasi.
2. Tunjukkan dashboard operasional.
3. Buka daftar tiket dan gunakan filter.
4. Masuk ke detail tiket lalu ubah assignee atau status.
5. Tambahkan komentar atau buka lampiran.
6. Tutup dengan API docs dan ringkasan arsitektur cloud.

Versi narasi yang lebih detail tersedia di [docs/demo-guide.md](./docs/demo-guide.md).

## API dan Integrasi

Endpoint yang tersedia pada implementasi saat ini mencakup:

- `GET /v1/health`
- `GET /v1/auth/me`
- `GET /v1/profile/me`
- `PATCH /v1/profile/me`
- `GET /v1/profiles/assignable`
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

## Catatan Teknis yang Penting untuk Operator

- Role sumber kebenaran ada di Cognito group, bukan di form profil frontend.
- Profil pengguna tetap disimpan di DynamoDB agar nama tampilan, avatar, dan daftar assignable bisa dipakai aplikasi.
- User baru akan mulai terlihat di picker assignment setelah profilnya pernah tersinkron ke tabel profil dan role tersimpannya termasuk `agent` atau `admin`.
- Jika role user berubah setelah profilnya sudah pernah tersimpan, lakukan sinkronisasi profil sekali lagi agar daftar assignable mengikuti role baru. Langkah praktisnya dijelaskan di operator guide.

## Batasan dan Ruang Pengembangan Lanjutan

Implementasi saat ini sudah siap dipakai sebagai aplikasi internal skala kecil-menengah dan kuat untuk kebutuhan presentasi teknis. Meski begitu, ruang pengembangan berikut masih terbuka:

- notifikasi real-time atau email operasional
- otomasi SLA dan eskalasi
- observability lanjutan seperti tracing dan alerting otomatis
- hardening produksi tambahan seperti custom domain, WAF, atau IAM tightening yang lebih granular

## Lisensi

Proyek ini menggunakan lisensi MIT. Lihat [LICENSE](./LICENSE) untuk detail lengkap.
