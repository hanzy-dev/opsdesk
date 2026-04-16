# Panduan Operasional

Dokumen ini merangkum observability dasar OpsDesk pada deployment aktif.

## Lokasi Log AWS

Log utama yang relevan:

- Lambda backend: `/aws/lambda/<BackendFunctionName>`
- API Gateway HTTP API access log: `/aws/apigateway/opsdesk-dev-http-api`

Nama Lambda aktual dapat dilihat dari output stack SAM `BackendFunctionName`.

## Apa Yang Dicatat

Backend sekarang menulis log JSON yang ramah CloudWatch untuk:

- request masuk
- response status
- latency per request
- kegagalan autentikasi
- aksi bisnis penting
- kegagalan upload atau download attachment yang relevan

Setiap request juga membawa `requestId`. Nilai ini:

- dikirim sebagai header `X-Request-Id`
- ikut muncul di body error backend sebagai `error.requestId`
- dipakai frontend sebagai "Kode referensi" saat error ditampilkan ke pengguna

## Cara Melacak Error Dengan Request ID

Jika UI menampilkan "Kode referensi", salin nilainya lalu cari di CloudWatch Logs Insights atau filter log stream Lambda dengan nilai tersebut.

Contoh query Logs Insights sederhana:

```sql
fields @timestamp, @message
| filter @message like /req-/
| sort @timestamp desc
| limit 50
```

Jika sudah tahu request ID tertentu:

```sql
fields @timestamp, @message
| filter @message like /req-1234567890abcdef/
| sort @timestamp asc
```

## Troubleshooting Ringkas

`401 unauthorized` atau `invalid_token`

- Pastikan login Cognito berhasil dan sesi frontend belum kedaluwarsa.
- Jika perlu, logout lalu login ulang.
- Cek log Lambda untuk event `auth.failure`.

`403 forbidden`

- Pastikan akun berada pada grup Cognito yang benar: `reporter`, `agent`, atau `admin`.
- Reporter memang tidak bisa mengambil assignment atau mengubah status tiket.

`500 internal_error`

- Ambil kode referensi dari UI.
- Cari `requestId` yang sama di log Lambda.
- Lihat event `request.complete` dan event bisnis sebelum error untuk konteks tambahan.

Gagal upload atau buka attachment

- Pastikan tipe file dan ukuran sesuai aturan aplikasi.
- Untuk upload, cek event `business.attachment_upload_url_failed` atau `business.attachment_save_failed`.
- Untuk download, cek event `business.attachment_download_url_failed`.
- Pastikan bucket S3 dan izin Lambda tetap terpasang dari stack SAM.

## Catatan Biaya Ringan

OpsDesk tetap memakai observability bawaan AWS yang ringan:

- CloudWatch Logs retention backend: 7 hari
- CloudWatch Logs retention API Gateway: 7 hari

Retention pendek ini membantu menjaga biaya tetap wajar untuk aplikasi helpdesk internal kecil.
