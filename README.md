# OpsDesk

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TypeScript-3178C6)](./frontend)
[![Backend](https://img.shields.io/badge/Backend-Go-00ADD8)](./backend)
[![AWS Stack](https://img.shields.io/badge/AWS-Lambda%20%7C%20API%20Gateway%20%7C%20DynamoDB%20%7C%20Cognito%20%7C%20S3-FF9900)](./infra)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%2B%20AWS%20SAM-111111)](./docs/setup.md)
[![Status](https://img.shields.io/badge/Status-Production--Oriented-0A7F5A)](./README.md)

OpsDesk adalah aplikasi helpdesk dan ticketing internal berbasis AWS untuk mencatat, menindaklanjuti, dan memantau laporan operasional dalam satu alur kerja yang terstruktur. Frontend berjalan di Vercel, backend Go diekspos melalui AWS API Gateway HTTP API dan dijalankan sebagai AWS Lambda container image, sementara data dan lampiran dikelola dengan DynamoDB dan S3 privat.

Proyek ini dibangun sebagai aplikasi cloud production-oriented untuk portfolio teknis: cukup lengkap untuk menunjukkan integrasi full-stack, autentikasi nyata, RBAC, deployment, dokumentasi API, dan kesiapan operasional dasar, tetapi tidak diposisikan sebagai platform ITSM enterprise yang lengkap.

## Tautan Deployment

- Frontend: `https://opsdesk-teal.vercel.app`
- Backend API: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- Swagger UI: `https://opsdesk-teal.vercel.app/api-docs`
- OpenAPI contract: [docs/openapi.yaml](./docs/openapi.yaml)
- AWS region: `ap-southeast-1`
- SAM stack aktif: `opsdesk-dev`

Konfigurasi Cognito deployment aktif:

- User Pool ID: `ap-southeast-1_sMFqei7IT`
- App Client ID: `3gtbp1t96krpj6t9hfon4ljujn`

## Apa yang Diselesaikan

Banyak laporan operasional internal berawal dari chat, DM, atau pesan informal. Pola itu cepat, tetapi sering menyulitkan tim ketika perlu mencari status terakhir, siapa pemilik masalah, lampiran pendukung, atau riwayat keputusan.

OpsDesk mengubah laporan tersebut menjadi tiket yang memiliki konteks lengkap:

- identitas pelapor dan role akun
- judul, deskripsi, prioritas, kategori, dan tim tujuan
- status dan penanggung jawab operasional
- komentar tindak lanjut
- lampiran pendukung
- timeline aktivitas sebagai audit trail ringan
- notifikasi berbasis aktivitas tiket yang relevan untuk user aktif

Chat tetap berguna untuk koordinasi cepat, sedangkan OpsDesk memberi tempat yang lebih tahan lama untuk pencatatan kasus, ownership, dan review progres.

## Kapabilitas Utama

- Login, refresh session, forgot password, reset password, dan change password melalui Amazon Cognito.
- RBAC berbasis Cognito group `reporter`, `agent`, dan `admin`.
- Dashboard operasional untuk ringkasan tiket, workload, aktivitas terbaru, dan quick actions.
- Daftar tiket dengan search, filter, sorting, dan pagination server-side.
- Detail tiket dengan metadata, status, assignee, komentar, lampiran, dan timeline aktivitas.
- Queue `Ditugaskan ke Saya` untuk tiket yang sedang menjadi tanggung jawab operator aktif.
- Assignment tiket untuk `agent` dan `admin`, termasuk self-assign dan reassignment ke operator eligible.
- Profil akun dan pengaturan akun.
- Lampiran aman memakai bucket S3 privat dan presigned URL.
- Dokumentasi API interaktif berbasis OpenAPI dan Swagger UI.

## Arsitektur Cloud

OpsDesk memakai arsitektur cloud yang sederhana, terpisah jelas, dan mudah diverifikasi:

```text
User
  -> Frontend React + Vite di Vercel
  -> Amazon Cognito untuk login dan JWT
  -> AWS API Gateway HTTP API
  -> Go backend di AWS Lambda container image
  -> DynamoDB untuk tiket dan profil
  -> S3 privat untuk lampiran
```

Alur request utama:

1. User login melalui Cognito dan memperoleh JWT.
2. Frontend mengirim `Authorization: Bearer <JWT>` ke API Gateway.
3. Lambda backend memverifikasi token, membaca role dari Cognito group, dan menerapkan RBAC.
4. Operasi tiket dan profil membaca atau menulis data ke DynamoDB.
5. Operasi lampiran menghasilkan presigned URL agar file bisa diunggah atau dibuka langsung dari S3 tanpa membuat bucket publik.
6. Response API dikembalikan dengan envelope JSON yang konsisten.

Diagram visual tersedia di [docs/diagram-pack.md](./docs/diagram-pack.md), sedangkan penjelasan arsitektur teks ada di [docs/architecture.md](./docs/architecture.md).

## Layanan AWS yang Digunakan

| Layanan | Peran |
| --- | --- |
| Amazon Cognito | Autentikasi, JWT, reset password, dan group role `reporter`, `agent`, `admin` |
| AWS API Gateway HTTP API | Entry point HTTPS untuk backend |
| AWS Lambda | Runtime backend Go dalam container image |
| Amazon DynamoDB | Penyimpanan tiket dan profil aplikasi |
| Amazon S3 | Bucket privat untuk lampiran tiket |
| AWS SAM | Infrastructure as code untuk resource backend dan deployment |
| Amazon CloudWatch | Log Lambda dan API Gateway untuk troubleshooting dasar |

Frontend dideploy terpisah di Vercel agar lapisan web client dan backend AWS tetap independen.

## Ringkasan RESTful API

Kontrak API aktif ada di [docs/openapi.yaml](./docs/openapi.yaml) dan dirender melalui Swagger UI di `https://opsdesk-teal.vercel.app/api-docs`. Dokumen tersebut mengikuti endpoint yang benar-benar terdaftar di backend Go saat ini.

Operasi utama:

- `GET`: health check, identitas login, profil, notifikasi, daftar tiket, detail tiket, aktivitas tiket, dan pembuatan download URL lampiran.
- `POST`: pembuatan tiket, komentar, pembuatan upload URL lampiran, dan registrasi metadata lampiran.
- `PATCH`: partial update untuk profil, status tiket, dan assignment tiket.

OpsDesk memakai `PATCH` untuk operasi update karena perubahan yang dilakukan bersifat parsial terhadap resource. Backend saat ini tidak mengekspos endpoint `PUT`; istilah `PUT` hanya muncul sebagai HTTP method yang harus dipakai browser saat mengunggah file langsung ke S3 melalui presigned upload URL.

Success response memakai envelope:

```json
{
  "data": {}
}
```

Error response memakai envelope:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "authentication is required",
    "requestId": "req-abc123",
    "status": 401,
    "method": "GET",
    "path": "/notifications",
    "timestamp": "2026-04-14T09:00:00Z"
  }
}
```

Ringkasan API lebih lengkap tersedia di [docs/api.md](./docs/api.md).

## Autentikasi dan RBAC

Role aplikasi berasal dari Amazon Cognito User Pool Group:

- `reporter`: membuat tiket dan memantau tiket miliknya sendiri.
- `agent`: melakukan triage, melihat tiket operasional, mengelola assignment, memberi komentar, dan memperbarui status.
- `admin`: memiliki cakupan operasional penuh, termasuk membuat tiket dan mengelola assignment.

Frontend memakai role untuk menyesuaikan pengalaman pengguna, tetapi enforcement akses tetap dilakukan di backend. Jika user tidak berada dalam group yang dikenali, sistem memperlakukannya sebagai `reporter`.

| Aksi | Reporter | Agent | Admin |
| --- | --- | --- | --- |
| Login ke aplikasi | Ya | Ya | Ya |
| Membuat tiket | Ya | Tidak | Ya |
| Melihat tiket sendiri | Ya | Ya | Ya |
| Melihat daftar tiket operasional | Tidak | Ya | Ya |
| Mengubah status tiket | Tidak | Ya | Ya |
| Mengelola assignment tiket | Tidak | Ya | Ya |
| Melihat queue `Ditugaskan ke Saya` | Tidak | Ya | Ya |

Panduan operasional Cognito dan assignment tersedia di [docs/operator-guide.md](./docs/operator-guide.md).

## Alur Tiket

OpsDesk memisahkan keputusan pelaporan dan keputusan operasional.

1. Reporter membuat tiket dengan status awal `open`.
2. Tiket masuk ke antrean operasional.
3. Agent atau admin melakukan triage.
4. Tiket dapat diambil sendiri atau ditugaskan ke operator lain yang eligible.
5. Status, komentar, dan lampiran diperbarui selama penanganan.
6. Aktivitas penting dicatat sebagai audit trail append-only.

Pemisahan ini penting karena pada saat tiket dibuat, operator paling tepat belum tentu sudah diketahui. Tiket tetap tercatat lebih dulu, lalu ownership ditetapkan melalui proses triage.

## Alur Lampiran

Lampiran tidak dikirim sebagai payload besar melalui Lambda. Alurnya:

1. Frontend meminta presigned upload URL ke backend.
2. Backend memvalidasi konteks tiket dan menghasilkan URL sementara untuk S3.
3. Frontend mengunggah file langsung ke bucket S3 privat memakai HTTP `PUT` ke URL tersebut.
4. Frontend mendaftarkan metadata lampiran ke backend.
5. Saat file perlu dibuka, backend menghasilkan presigned download URL sementara.

Model ini menjaga bucket tetap privat, mengurangi beban Lambda, dan membuat akses file tetap terkontrol.

## Dokumentasi API dan Swagger UI

Swagger UI tersedia di:

```text
https://opsdesk-teal.vercel.app/api-docs
```

Halaman ini merender [docs/openapi.yaml](./docs/openapi.yaml), sehingga dapat dipakai sebagai:

- referensi endpoint dan schema request/response
- permukaan verifikasi kontrak API
- alat uji manual endpoint protected dengan bearer JWT Cognito
- dokumentasi teknis untuk reviewer dan developer

OpenAPI sengaja hanya mendokumentasikan endpoint yang sudah diimplementasikan.

## Pengembangan Lokal

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

Buat `frontend/.env` atau `frontend/.env.local` berdasarkan [frontend/.env.example](./frontend/.env.example).

```text
VITE_API_BASE_URL=http://localhost:8080/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
VITE_COGNITO_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

Panduan setup yang lebih rinci tersedia di [docs/setup.md](./docs/setup.md).

## Deployment dan Infrastruktur

Release OpsDesk memakai dua jalur terpisah. Frontend dideploy oleh Vercel dari folder `frontend`, sedangkan backend AWS dan resource infrastrukturnya dideploy manual lewat AWS SAM dari folder `infra`. Readiness check yang hanya menjalankan validate/build belum berarti Lambda live sudah berubah; setelah perubahan backend atau template SAM, jalankan `sam build` dan `sam deploy`, lalu verifikasi endpoint live.

Backend dideploy ke AWS menggunakan SAM. Parameter utama pada baseline aktif:

- `ProjectName=opsdesk`
- `StageName=dev`
- `AppEnv=dev`
- `ApiBasePath=/v1`
- `FrontendOrigin=https://opsdesk-teal.vercel.app`
- `LogLevel=info`

Perintah deploy dari folder `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml --no-cached
sam deploy --template-file .aws-sam\build\template.yaml --config-file samconfig.toml --stack-name opsdesk-dev --region ap-southeast-1 --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM --resolve-s3 --resolve-image-repos
```

Lambda dibangun sebagai container image dari [backend/Dockerfile.lambda](./backend/Dockerfile.lambda), sehingga Docker perlu aktif saat `sam build`.

Frontend dideploy di Vercel dengan konfigurasi:

- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Detail environment dan verifikasi deployment tersedia di [docs/setup.md](./docs/setup.md) dan [docs/release-checklist.md](./docs/release-checklist.md).

## Kesiapan Operasional

OpsDesk sudah memiliki beberapa elemen kesiapan operasional dasar:

- API health endpoint di `/health`.
- Request ID dan correlation ID pada response error.
- Log request backend melalui Lambda dan API Gateway.
- CORS backend dikunci ke frontend production.
- S3 bucket lampiran privat dengan public access block, SSE-S3, dan cleanup incomplete multipart upload.
- DynamoDB memakai billing on-demand dengan opsi Point-in-Time Recovery dari parameter SAM.
- OpenAPI/Swagger sebagai kontrak API dan permukaan verifikasi.
- Test frontend dan backend untuk alur penting.
- Dokumentasi operator, setup, release checklist, dan demo guide.

Dokumen pendukung:

- [docs/operations.md](./docs/operations.md)
- [docs/release-checklist.md](./docs/release-checklist.md)
- [docs/demo-guide.md](./docs/demo-guide.md)

## Catatan Keamanan

- Autentikasi menggunakan Amazon Cognito Bearer JWT.
- Role dan RBAC bersumber dari Cognito group dan diverifikasi ulang di backend.
- S3 bucket untuk lampiran bersifat privat.
- Upload dan download file memakai presigned URL sementara.
- Frontend tidak menyimpan atau menampilkan secret backend.
- Backend tidak boleh mencatat bearer token, JWT, password, atau nilai sensitif ke log.
- CORS dikonfigurasi untuk domain frontend production.

Keamanan saat ini cukup untuk baseline aplikasi internal dan demo production-oriented, tetapi belum mencakup hardening enterprise seperti WAF, malware scanning lampiran, audit compliance formal, atau policy IAM yang sangat granular.

## Batasan yang Diketahui

OpsDesk belum diposisikan sebagai platform ITSM enterprise penuh. Batasan yang masih ada:

- notifikasi belum real-time penuh dan belum mengirim email otomatis
- SLA masih berupa target operasional ringan, belum kalender bisnis kompleks
- dashboard analitik memakai model data tiket saat ini, bukan engine BI terpisah
- help center masih berupa konten lokal ringan, bukan knowledge base dengan workflow editorial
- observability sudah mendukung troubleshooting dasar, tetapi belum mencakup alerting dan tracing lanjutan
- attachment belum melalui malware scanning otomatis
- accessibility sudah dipoles pada surface utama, tetapi belum melalui audit WCAG formal menyeluruh

## Roadmap

Future work yang realistis:

- notifikasi email atau real-time event delivery
- SLA dan eskalasi berbasis aturan
- observability lanjutan dengan alerting
- custom domain untuk API dan frontend
- hardening IAM, WAF, dan policy keamanan tambahan
- attachment scanning sebelum file dianggap aman untuk dibuka
- knowledge base yang lebih lengkap untuk self-service

## Tautan Dokumentasi

- API reference: [docs/api.md](./docs/api.md)
- OpenAPI YAML: [docs/openapi.yaml](./docs/openapi.yaml)
- Arsitektur teks: [docs/architecture.md](./docs/architecture.md)
- Diagram pack: [docs/diagram-pack.md](./docs/diagram-pack.md)
- Setup dan deployment: [docs/setup.md](./docs/setup.md)
- Release checklist: [docs/release-checklist.md](./docs/release-checklist.md)
- Panduan operator: [docs/operator-guide.md](./docs/operator-guide.md)
- Panduan demo: [docs/demo-guide.md](./docs/demo-guide.md)
- Panduan penggunaan: [docs/usage-guide.md](./docs/usage-guide.md)
- Operations guide: [docs/operations.md](./docs/operations.md)
- Portfolio pack: [docs/portfolio-pack.md](./docs/portfolio-pack.md)
- Project summary: [docs/project-summary.md](./docs/project-summary.md)

## Lisensi

Proyek ini menggunakan lisensi MIT. Lihat [LICENSE](./LICENSE) untuk detail lengkap.
