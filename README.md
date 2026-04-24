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

## Mengapa OpsDesk Lebih Tepat Daripada Chat atau WA

OpsDesk tidak berusaha menggantikan chat untuk komunikasi cepat antar orang. Nilainya muncul ketika laporan operasional perlu tetap bisa dibaca ulang, dipantau, dan dipertanggungjawabkan.

Dalam chat atau WhatsApp:

- konteks mudah tercecer di banyak percakapan
- status terakhir sering harus ditanyakan ulang
- ownership tidak selalu terlihat jelas
- lampiran dan bukti tidak selalu menempel pada satu kasus
- sulit menunjukkan histori keputusan dengan rapi saat review atau audit ringan

Dalam OpsDesk:

- satu isu tetap berada pada satu tiket
- status, komentar, lampiran, dan assignment berada pada konteks yang sama
- dashboard dan queue membantu membaca prioritas serta beban kerja
- help center memberi jalur self-service ringan sebelum atau sesudah submit tiket
- riwayat aktivitas memberi audit trail yang cukup kuat untuk kebutuhan internal dan demo produk

Dengan kata lain, chat tetap berguna untuk koordinasi cepat, tetapi OpsDesk lebih tepat untuk pencatatan kasus, ownership, dan pelacakan progres yang perlu bertahan lebih lama dari satu percakapan.

## Link Deployment

- Frontend: `https://opsdesk-teal.vercel.app`
- Backend API: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- API docs: `https://opsdesk-teal.vercel.app/api-docs`
- AWS region: `ap-southeast-1`
- SAM stack aktif: `opsdesk-dev`

Kontrak API live untuk deployment ini didokumentasikan di [docs/openapi.yaml](./docs/openapi.yaml) dan ditampilkan ulang di Swagger UI `https://opsdesk-teal.vercel.app/api-docs`. Keduanya mengikuti endpoint backend AWS yang benar-benar aktif saat ini, bukan mock docs.

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

## Setup Akun Reviewer Dan Demo

Bagian ini dibuat untuk reviewer, dosen, atau operator yang ingin menyiapkan akun demo dengan cepat tanpa menebak-nebak alur Cognito.

### Prinsip yang perlu diingat

- Sumber kebenaran role ada di Cognito group `reporter`, `agent`, dan `admin`.
- Role tidak diubah dari halaman profil frontend.
- User operasional baru biasanya baru muncul di assignment picker setelah login ke OpsDesk minimal satu kali.
- Jika role user baru saja berubah, minta user logout lalu login ulang agar JWT dan profil aplikasi tersinkron.

### Langkah cepat via AWS CLI

Contoh berikut memakai deployment aktif saat ini:

- Region: `ap-southeast-1`
- User Pool ID: `ap-southeast-1_sMFqei7IT`

Contoh `Reporter`:

```bash
aws cognito-idp admin-create-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.reporter@contoh.com \
  --user-attributes Name=email,Value=reviewer.reporter@contoh.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.reporter@contoh.com \
  --password 'PasswordAwal123' \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.reporter@contoh.com \
  --group-name reporter
```

Contoh `Agent`:

```bash
aws cognito-idp admin-create-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.agent@contoh.com \
  --user-attributes Name=email,Value=reviewer.agent@contoh.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.agent@contoh.com \
  --password 'PasswordAwal123' \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.agent@contoh.com \
  --group-name agent
```

Contoh `Admin`:

```bash
aws cognito-idp admin-create-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.admin@contoh.com \
  --user-attributes Name=email,Value=reviewer.admin@contoh.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.admin@contoh.com \
  --password 'PasswordAwal123' \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.admin@contoh.com \
  --group-name admin
```

Verifikasi group user:

```bash
aws cognito-idp admin-list-groups-for-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username reviewer.agent@contoh.com
```

### Langkah cepat via AWS Management Console

Ulangi alur berikut untuk setiap role demo:

1. Buka AWS Console lalu masuk ke Amazon Cognito.
2. Pilih User Pool `opsdesk-dev-users` atau pool dengan ID `ap-southeast-1_sMFqei7IT`.
3. Buka menu `Users`, lalu pilih `Create user`.
4. Isi email reviewer sebagai username dan atribut email.
5. Tandai email sebagai verified bila Anda ingin akun langsung siap dipakai untuk demo.
6. Set password permanen, atau buat user lalu tetapkan password dari halaman detail user.
7. Buka tab `Groups` dan tambahkan user ke salah satu group:
   - `reporter`
   - `agent`
   - `admin`
8. Minta user login ke OpsDesk minimal sekali.
9. Untuk `agent` atau `admin`, verifikasi bahwa akun tersebut akhirnya muncul di assignment picker setelah sinkronisasi profil.

### Panduan akun demo

Untuk demo reviewer, akun minimum yang disarankan:

- `Reporter`: dipakai untuk login, membuat tiket, melihat tiket sendiri, dan menunjukkan sudut pandang pelapor.
- `Agent`: dipakai untuk dashboard operasional, `Ditugaskan ke Saya`, update status, dan komentar tindak lanjut.
- `Admin`: dipakai untuk visibilitas operasional penuh dan distribusi assignment.

Praktik yang paling aman:

- siapkan 3 akun berbeda, bukan 1 akun dengan role yang sering diganti
- minta akun `agent` dan `admin` login minimal satu kali sebelum demo agar profilnya tersimpan
- siapkan minimal satu tiket terbuka dan satu tiket yang sudah punya assignee agar flow lebih mudah dijelaskan

### Troubleshooting singkat

- User bisa login tetapi menu operasional tidak muncul:
  Pastikan user benar-benar berada di group `agent` atau `admin`, lalu logout dan login ulang agar token terbaru dipakai.
- User `agent` atau `admin` belum muncul di assignment picker:
  Pastikan user sudah pernah login minimal sekali, lalu buka `Profil` dan klik `Simpan Profil` agar role tersimpan ke tabel profil aplikasi.
- Reviewer salah group atau role terasa tidak sesuai:
  Cek hasil `admin-list-groups-for-user`. Jika perlu, remove dari group lama lalu add ke group baru, kemudian minta login ulang.

Panduan operator yang lebih rinci tersedia di [docs/operator-guide.md](./docs/operator-guide.md).

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

- Diagram pack: [docs/diagram-pack.md](./docs/diagram-pack.md)
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

## Diagram Visual

Untuk penjelasan visual yang lebih cepat dipahami, lihat [docs/diagram-pack.md](./docs/diagram-pack.md). Dokumen tersebut merangkum diagram arsitektur sistem, user flow, lifecycle tiket, RBAC, alur upload lampiran privat, dan audit trail.

## Roadmap Singkat

Bagian berikut belum ada pada implementasi saat ini dan termasuk future work:

- notifikasi email atau real-time
- otomasi SLA dan eskalasi
- observability lanjutan seperti tracing dan alerting
- hardening produksi tambahan seperti custom domain, WAF, dan IAM tightening yang lebih granular

## Known Limitations

Dokumentasi ini sengaja jujur: OpsDesk sudah cukup kuat untuk demo, portfolio, dan baseline operasional internal ringan, tetapi belum diposisikan sebagai platform enterprise yang lengkap.

Limitasi yang masih ada pada baseline saat ini:

- notifikasi belum real-time penuh dan belum mengirim email otomatis
- SLA masih berupa target operasional ringan berbasis prioritas, belum kalender bisnis kompleks
- dashboard analitik memakai data yang tersedia pada model tiket saat ini, bukan engine BI terpisah
- help center masih berupa konten lokal ringan, bukan knowledge base enterprise dengan workflow editorial
- observability sudah cukup untuk tracing request dasar, tetapi belum mencakup alerting atau telemetry lanjutan
- accessibility sudah dipoles pada surface utama, namun belum melalui audit WCAG formal menyeluruh
- fokus produk tetap pada helpdesk internal ringan, bukan service management enterprise multi-proses

## Lisensi

Proyek ini menggunakan lisensi MIT. Lihat [LICENSE](./LICENSE) untuk detail lengkap.
