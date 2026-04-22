# OpsDesk

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TypeScript-3178C6)](./frontend)
[![Backend](https://img.shields.io/badge/Backend-Go-00ADD8)](./backend)
[![AWS Stack](https://img.shields.io/badge/AWS-Lambda%20%7C%20API%20Gateway%20%7C%20DynamoDB%20%7C%20Cognito%20%7C%20S3-FF9900)](./infra)
[![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%2B%20AWS%20SAM-111111)](./docs/setup.md)
[![Status: Production-Oriented](https://img.shields.io/badge/Status-Production--Oriented-0A7F5A)](./README.md)

OpsDesk adalah aplikasi helpdesk dan ticketing internal berbasis cloud untuk menangani laporan operasional secara lebih terstruktur daripada chat ad-hoc. Repository ini memuat frontend React, backend Go, infrastruktur AWS SAM, serta dokumentasi yang disusun untuk dua kebutuhan sekaligus: membantu dosen atau reviewer memahami produk dengan cepat, dan membantu operator atau developer menjalankannya dengan rapi.

## Apa Itu OpsDesk

OpsDesk dipakai ketika tim membutuhkan cara yang lebih disiplin untuk menerima, menindaklanjuti, dan memantau masalah internal seperti gangguan layanan, permintaan bantuan, atau isu operasional harian.

Alih-alih laporan tercecer di WhatsApp atau chat personal, OpsDesk menempatkan setiap masalah sebagai tiket yang memiliki:

- identitas pelapor
- judul dan deskripsi yang jelas
- prioritas dan status
- penanggung jawab operasional
- lampiran pendukung
- komentar tindak lanjut
- riwayat aktivitas yang dapat ditelusuri

## Masalah Yang Diselesaikan

Chat biasa memang cepat, tetapi kurang baik untuk operasi yang perlu dilacak. Ketika laporan masuk lewat WhatsApp atau DM:

- ownership mudah kabur karena tidak ada penanggung jawab yang formal
- prioritas sering tidak terlihat jelas
- histori keputusan tersebar di banyak percakapan
- lampiran tidak terikat rapi ke satu kasus
- sulit menjawab pertanyaan seperti "siapa yang sedang menangani?" atau "kapan status terakhir berubah?"

OpsDesk menyelesaikan masalah itu dengan model kerja helpdesk:

- satu laporan menjadi satu tiket
- tiket bisa diprioritaskan dan dipantau
- assignment menentukan siapa operator yang bertanggung jawab
- dashboard memberi gambaran antrean kerja
- audit trail mencatat perubahan penting
- lampiran tersimpan secara terstruktur

## Nilai Operasional End-to-End

OpsDesk bukan hanya tempat membuat tiket. Nilai operasionalnya muncul dari alur lengkap berikut:

1. Pelapor membuat tiket saat masalah terjadi.
2. Tiket masuk ke sistem sebagai antrean kerja yang bisa dilihat pihak operasional.
3. Agent atau admin melakukan triage untuk menentukan siapa yang harus menangani.
4. Tiket dapat diambil sendiri atau ditugaskan ke operator yang relevan.
5. Status, komentar, dan lampiran diperbarui selama penanganan.
6. Riwayat aktivitas tetap tersimpan sebagai jejak audit.

Hasilnya, tim mendapatkan kombinasi ownership, histori, visibilitas, dan akuntabilitas yang jauh lebih kuat dibanding chat ad-hoc.

## Link Deployment

- Frontend: `https://opsdesk-teal.vercel.app`
- Backend API: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- API docs: `https://opsdesk-teal.vercel.app/api-docs`
- AWS region: `ap-southeast-1`
- SAM stack aktif: `opsdesk-dev`

Konfigurasi Cognito deployment aktif:

- User Pool ID: `ap-southeast-1_sMFqei7IT`
- App Client ID: `3gtbp1t96krpj6t9hfon4ljujn`

## Ticket Workflow

Bagian ini penting karena menjadi sumber kebingungan paling umum saat demo.

### Model dasarnya

1. Reporter membuat tiket.
2. Tiket masuk ke sistem dengan status awal `open`.
3. Tiket belum harus langsung punya assignee.
4. Agent atau admin kemudian melakukan triage.
5. Setelah itu tiket bisa:
   - diambil sendiri oleh operator
   - ditugaskan ke operator lain yang eligible
   - dibiarkan tetap belum ditugaskan sampai ada keputusan penanganan

### Mengapa "Create Ticket" tidak langsung assign?

OpsDesk memisahkan dua keputusan yang berbeda:

- keputusan pelaporan: "ada masalah yang perlu dicatat"
- keputusan operasional: "siapa yang harus menangani"

Pemisahan ini penting karena pada saat tiket dibuat, operator yang paling tepat belum tentu sudah diketahui. Dengan begitu, tiket tetap tercatat lebih dulu, lalu tim operasional bisa melakukan triage secara lebih sadar.

### Arti "Ditugaskan ke Saya"

"Ditugaskan ke Saya" adalah work queue untuk akun operator yang sedang login. Halaman ini bukan daftar semua tiket yang pernah disentuh, melainkan daftar tiket yang `assignee`-nya saat ini mengarah ke operator tersebut.

Secara praktis, halaman ini menjawab pertanyaan:

- tiket mana yang saat ini menjadi tanggung jawab saya?
- tiket mana yang perlu saya tindak lanjuti lebih dulu?

Queue ini hanya muncul untuk role operasional yang memang bisa menerima assignment, yaitu `agent` dan `admin`.

## Ringkasan RBAC

Role diturunkan dari Cognito User Pool Group dan menjadi sumber kebenaran hak akses.

Prioritas role:

1. `admin`
2. `agent`
3. `reporter`

Jika user tidak berada pada group yang dikenali, sistem memperlakukannya sebagai `reporter`.

### Matriks akses praktis

| Aksi | Reporter | Agent | Admin |
| --- | --- | --- | --- |
| Login ke aplikasi | Ya | Ya | Ya |
| Melihat dashboard dan daftar tiket operasional | Tidak | Ya | Ya |
| Melihat tiket sendiri | Ya | Ya | Ya |
| Membuat tiket | Ya | Tidak | Ya |
| Membuat tiket atas nama pelapor lain | Tidak | Tidak | Ya |
| Menambahkan komentar pada tiket yang dapat diakses | Ya | Ya | Ya |
| Mengubah status tiket | Tidak | Ya | Ya |
| Mengambil atau memindahkan assignment tiket | Tidak | Ya | Ya |
| Melihat queue "Ditugaskan ke Saya" | Tidak | Ya | Ya |
| Memantau antrean operasional lintas tiket | Tidak | Ya | Ya |

Makna praktis tiap role:

- `reporter`: fokus pada pelaporan masalah dan pemantauan tiket miliknya sendiri.
- `agent`: fokus pada triage, penanganan, update status, komentar, dan pengambilan assignment.
- `admin`: memiliki cakupan operasional penuh dan dapat membuat tiket selain mengelola penugasan.

## Fitur Yang Sudah Tersedia

- Login Amazon Cognito dengan sesi JWT
- RBAC berbasis Cognito group `reporter`, `agent`, dan `admin`
- Dashboard operasional dengan ringkasan tiket dan aktivitas
- Daftar tiket dengan pencarian, filter, sorting, dan pagination server-side
- Halaman detail tiket dengan komentar, lampiran, status, assignee, dan timeline aktivitas
- Queue `/tickets/assigned` untuk tiket yang ditugaskan ke operator aktif
- Pengelolaan assignment untuk `agent` dan `admin`
- Profil akun dan pengaturan akun terpisah
- Forgot password, reset password, dan change password berbasis Cognito
- Dokumentasi OpenAPI dengan viewer Swagger UI

## Arsitektur Singkat

OpsDesk memakai arsitektur cloud yang sederhana tetapi nyata:

- Amazon Cognito untuk autentikasi dan resolusi role
- Frontend React + Vite di Vercel sebagai web client
- API Gateway HTTP API sebagai pintu masuk backend
- Go backend di AWS Lambda container image
- DynamoDB untuk data tiket dan profil
- S3 privat untuk lampiran melalui presigned upload/download URL

Alur utamanya:

1. User login melalui Cognito.
2. Frontend mengirim bearer token ke API Gateway.
3. Backend Lambda memverifikasi JWT dan menerapkan RBAC.
4. Data tiket dibaca atau ditulis ke DynamoDB.
5. Lampiran memakai alur presigned URL ke bucket S3 privat.
6. Aktivitas penting tiket dicatat sebagai audit trail append-only.

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

Buat `frontend/.env` berdasarkan [frontend/.env.example](./frontend/.env.example).

```text
VITE_API_BASE_URL=http://localhost:8080/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
VITE_COGNITO_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

## Deployment dan Infrastruktur

Parameter SAM utama pada konfigurasi aktif:

- `ProjectName=opsdesk`
- `StageName=dev`
- `AppEnv=dev`
- `ApiBasePath=/v1`
- `FrontendOrigin=https://opsdesk-teal.vercel.app`
- `LogLevel=info`

Resource penting:

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

## Demo Setup Yang Direkomendasikan

Untuk presentasi live, siapkan tiga akun:

- `Reporter`: menunjukkan pembuatan tiket dan sudut pandang pelapor
- `Agent`: menunjukkan queue "Ditugaskan ke Saya", update status, komentar, dan penanganan tiket
- `Admin`: menunjukkan visibilitas operasional penuh dan kemampuan assignment

Panduan lengkap ada di [docs/demo-guide.md](./docs/demo-guide.md).

## Dokumentasi Tambahan

- Panduan operator: [docs/operator-guide.md](./docs/operator-guide.md)
- Panduan demo: [docs/demo-guide.md](./docs/demo-guide.md)
- Panduan penggunaan: [docs/usage-guide.md](./docs/usage-guide.md)
- Arsitektur teks: [docs/architecture.md](./docs/architecture.md)
- Setup dan deployment: [docs/setup.md](./docs/setup.md)
- API reference: [docs/api.md](./docs/api.md)
- OpenAPI YAML: [docs/openapi.yaml](./docs/openapi.yaml)
- Portfolio pack: [docs/portfolio-pack.md](./docs/portfolio-pack.md)
- Project summary: [docs/project-summary.md](./docs/project-summary.md)

## Catatan Operator

- Role sumber kebenaran ada di Cognito group, bukan di form profil frontend.
- User operasional baru akan muncul pada daftar assignment setelah memiliki profil aplikasi yang tersimpan dengan role `agent` atau `admin`.
- Dokumentasi langkah Console dan AWS CLI untuk membuat user, set password, verifikasi group, dan sinkronisasi assignment tersedia di [docs/operator-guide.md](./docs/operator-guide.md).

## Roadmap Singkat

Bagian berikut belum ada pada implementasi saat ini dan termasuk future work:

- notifikasi email atau real-time
- otomasi SLA dan eskalasi
- observability lanjutan seperti tracing dan alerting
- hardening produksi tambahan seperti custom domain, WAF, dan IAM tightening yang lebih granular

## Lisensi

Proyek ini menggunakan lisensi MIT. Lihat [LICENSE](./LICENSE) untuk detail lengkap.
