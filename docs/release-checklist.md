# Release Checklist

Checklist ini dipakai untuk verifikasi rilis OpsDesk setelah perubahan frontend, backend, infrastruktur, atau kontrak API. Fokusnya adalah memastikan deployment Vercel dan AWS tetap sinkron, endpoint live berperilaku sesuai OpenAPI, dan alur utama aplikasi masih aman dipakai.

## Dokumen yang Perlu Dicek

1. [README.md](../README.md)
2. [setup.md](./setup.md)
3. [api.md](./api.md)
4. [openapi.yaml](./openapi.yaml)
5. [operations.md](./operations.md)
6. [reviewer-checklist.md](./reviewer-checklist.md)

## Konfigurasi yang Harus Cocok

1. Frontend production tetap `https://opsdesk-teal.vercel.app`.
2. Backend API base URL tetap `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`.
3. Vercel env `VITE_API_BASE_URL` mengarah ke URL API Gateway `/dev/v1` yang sama.
4. SAM parameter `FrontendOrigin` hanya mengizinkan domain frontend production.
5. SAM parameter `ApiBasePath` bernilai `/v1`.
6. `docs/openapi.yaml` memakai server URL live yang sama.
7. Tidak ada dokumentasi utama yang mengarahkan reviewer ke preview domain.

## Smoke Test Setelah Deploy

Jalankan smoke test ini setelah `sam deploy`, setelah deployment Vercel, atau setelah perubahan kontrak API. Tujuannya bukan menguji semua edge case, tetapi memastikan jalur produksi utama tidak putus.

### 1. Verifikasi Build dan Test Lokal

Dari folder `backend/`:

```bash
go test ./...
```

Dari folder `frontend/`:

```bash
npm test -- --run
npm run build
```

Checklist:

- backend test suite selesai tanpa failure
- frontend test suite selesai tanpa failure
- build frontend berhasil menghasilkan output `dist`
- tidak ada perubahan frontend/backend yang belum diikuti deployment sesuai layernya

### 2. Verifikasi Deployment Backend AWS SAM

Dari folder `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --config-file samconfig.toml --resolve-image-repos
```

Checklist:

- `sam validate` berhasil
- `sam build` berhasil membangun Lambda container image
- `sam deploy` selesai tanpa rollback
- output stack masih menampilkan `ApiBaseUrl`, `BackendFunctionName`, `CognitoUserPoolId`, dan `CognitoUserPoolClientId`
- setelah ada perubahan backend, Lambda sudah benar-benar dideploy ulang, bukan hanya frontend yang diperbarui

### 3. Verifikasi Health dan Routing API Gateway

```bash
curl -i https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health
```

Ekspektasi:

- status HTTP `200`
- response memakai envelope `data`
- `data.status` bernilai `ok`
- `data.env` bernilai `dev`

### 4. Verifikasi Endpoint Protected Tanpa Token

```bash
curl -i https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/auth/me
curl -i "https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/notifications?limit=12"
curl -i https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/tickets
```

Ekspektasi:

- endpoint protected mengembalikan `401 Unauthorized`
- response error memakai envelope `error`
- `GET /notifications?limit=12` tanpa token mengembalikan `401`, bukan `404`
- tidak ada response plain text `404 page not found` untuk route yang didokumentasikan

### 5. Verifikasi Endpoint Cognito-Authenticated

Gunakan ID token Cognito dari sesi login valid:

```bash
TOKEN="<id-token>"

curl -i -H "Authorization: Bearer $TOKEN" \
  https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/auth/me

curl -i -H "Authorization: Bearer $TOKEN" \
  https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/profile/me

curl -i -H "Authorization: Bearer $TOKEN" \
  "https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/notifications?limit=12"
```

Ekspektasi:

- token valid diterima backend
- response sukses memakai envelope `data`
- `/auth/me` menampilkan role yang sesuai dengan Cognito group
- `/notifications?limit=12` mengembalikan `200` dengan list notifikasi, atau `data: []` bila belum ada notifikasi

### 6. Verifikasi Flow GET, POST, dan PATCH

Uji dari UI production atau via API dengan bearer token yang sesuai.

Checklist GET:

- user dapat membuka dashboard
- user dapat melihat daftar tiket
- user dapat membuka detail tiket
- user dapat membaca aktivitas tiket
- user dapat membaca notifikasi tanpa error routing

Checklist POST:

- reporter atau admin dapat membuat tiket baru
- user yang berwenang dapat menambahkan komentar
- backend mengembalikan `201` untuk create ticket/comment yang valid

Checklist PATCH/update:

- `PATCH /profile/me` dapat menyimpan perubahan profil sederhana
- agent/admin dapat mengubah status tiket
- agent/admin dapat memperbarui assignment tiket
- reporter tidak dapat melakukan update operasional yang bukan haknya dan menerima `403`

Catatan: OpsDesk memakai `PATCH` untuk partial update. API OpsDesk tidak mengekspos endpoint `PUT`; `PUT` hanya dipakai saat upload langsung ke S3 melalui presigned URL.

### 7. Verifikasi Flow Lampiran S3 Presigned URL

Checklist:

- user yang berwenang dapat meminta upload URL lampiran
- response upload URL berisi `uploadUrl`, `uploadMethod`, `uploadHeaders`, dan `expiresAt`
- file berhasil diunggah langsung ke S3 memakai presigned URL
- metadata lampiran berhasil disimpan melalui endpoint backend
- detail tiket menampilkan lampiran yang baru disimpan
- download/open URL dapat dibuat dan membuka file
- bucket S3 tetap privat, file tidak diakses melalui public object URL

### 8. Verifikasi Swagger/OpenAPI

Checklist:

- buka `https://opsdesk-teal.vercel.app/api-docs`
- Swagger UI berhasil dirender
- link YAML OpenAPI dapat dibuka
- server URL di Swagger mengarah ke `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- endpoint live yang diuji ada di `docs/openapi.yaml`
- OpenAPI tidak mendokumentasikan endpoint aspirational yang belum diimplementasikan
- contoh response error 401/403/404 memakai kode yang sesuai, bukan `validation_failed`

### 9. Verifikasi Frontend Deployment Vercel

Checklist:

- deployment Vercel terbaru memakai root directory `frontend`
- build command tetap `npm run build`
- output directory tetap `dist`
- env `VITE_API_BASE_URL` mengarah ke API Gateway live `/dev/v1`
- login Cognito dari frontend production berhasil
- request browser ke backend tidak gagal karena CORS
- dashboard dan topbar tetap usable bila notifikasi kosong atau gagal sementara

### 10. Cek Mismatch Versi Frontend dan Backend

Masalah umum setelah deploy adalah frontend sudah memanggil endpoint baru, tetapi Lambda image live belum diperbarui.

Checklist:

- jika frontend menerima `404` dari endpoint yang ada di OpenAPI, cek apakah backend sudah `sam deploy`
- jika `/health` sukses tetapi endpoint lain 404, curigai router Lambda live masih versi lama
- jika Swagger sudah menampilkan endpoint baru, pastikan Lambda live juga sudah memuat route tersebut
- jika frontend gagal CORS, cek `FrontendOrigin` di SAM dan domain Vercel yang sedang dipakai
- jika auth gagal di frontend tetapi curl dengan token valid berhasil, cek env Cognito di Vercel

## Verifikasi Visual dan Accessibility Ringan

1. Navigasikan halaman utama dengan keyboard.
2. Pastikan topbar, sidebar, dashboard cards, quick actions, tray notifikasi, dan dialog penting punya fokus yang terlihat.
3. Pastikan empty state, loading state, dan error state tetap konsisten.
4. Pastikan badge status, prioritas, dan role tetap mudah dibaca.
5. Jika perangkat memakai `prefers-reduced-motion`, pastikan animasi utama tidak mengganggu.

## Data Demo dan Screenshot

1. Siapkan satu akun `reporter`, satu `agent`, dan satu `admin`.
2. Siapkan minimal satu tiket terbuka dan satu tiket yang sudah assigned.
3. Pastikan screenshot tidak memuat data pribadi nyata.
4. Ambil screenshot representatif untuk dashboard, daftar tiket, detail tiket, form tiket, dan login.
5. Jangan klaim fitur yang belum ada, seperti notifikasi email, SLA enterprise, atau observability lanjutan.

## Yang Sengaja Belum Dicakup

- malware scanning lampiran
- alerting otomatis
- distributed tracing penuh
- audit accessibility formal WCAG
- custom domain dan WAF
