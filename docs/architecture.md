# OpsDesk Architecture

Dokumen ini menjelaskan arsitektur OpsDesk dalam bentuk teks singkat tanpa diagram, dengan fokus pada komponen yang memang sudah ada pada implementasi saat ini. Untuk versi visual yang lebih cepat dibaca, lihat [diagram pack](./diagram-pack.md).

## Gambaran Umum

OpsDesk adalah aplikasi helpdesk internal berbasis arsitektur serverless AWS. Frontend berjalan terpisah dari backend, autentikasi ditangani oleh Cognito, dan data operasional disimpan di layanan managed AWS agar deployment tetap sederhana namun realistis.

## Komponen Utama

### 1. Cognito untuk autentikasi dan role

Amazon Cognito User Pool dipakai untuk:

- login pengguna
- token JWT
- reset password
- sumber kebenaran role melalui group `reporter`, `agent`, dan `admin`

Frontend dan backend sama-sama membaca identitas ini, tetapi enforcement akses tetap dilakukan di backend.

### 2. Frontend React + Vite di Vercel

Frontend bertugas untuk:

- menampilkan dashboard, daftar tiket, detail tiket, profil, dan pengaturan akun
- memanggil Cognito untuk alur autentikasi
- mengirim bearer token ke backend
- menampilkan UI berbahasa Indonesia untuk user akhir

### 3. API Gateway HTTP API

API Gateway menjadi pintu masuk HTTP untuk:

- endpoint autentikasi terproteksi
- operasi tiket
- operasi profil
- upload dan download lampiran berbasis presigned URL

### 4. Go backend di AWS Lambda container image

Backend Go menjalankan logika aplikasi seperti:

- verifikasi JWT Cognito
- resolusi role dan RBAC
- validasi request
- pembuatan tiket
- update status
- assignment tiket
- komentar dan aktivitas
- orkestrasi upload atau download lampiran

### 5. DynamoDB

DynamoDB dipakai untuk dua kebutuhan utama:

- tabel tiket
- tabel profil

Data tiket mencakup informasi inti seperti pelapor, assignee, status, prioritas, komentar, aktivitas, dan metadata lampiran. Data profil dipakai untuk kebutuhan tampilan akun dan daftar operator yang bisa menerima assignment.

Kedua tabel memakai billing on-demand (`PAY_PER_REQUEST`) agar biaya mengikuti pemakaian. Stack SAM juga menyediakan Point-in-Time Recovery sebagai perlindungan data dasar yang bisa dinonaktifkan lewat parameter deployment bila stack hanya dipakai untuk eksperimen sementara.

### 6. S3 privat untuk lampiran

Lampiran tidak diunggah langsung lewat backend sebagai file payload besar. Sebagai gantinya:

1. frontend meminta presigned upload URL
2. file diunggah ke bucket S3 privat
3. metadata lampiran disimpan ke tiket
4. file dibuka kembali melalui presigned download URL

Model ini menjaga backend tetap ringan dan membuat akses file tetap terkontrol.

Bucket lampiran memblokir public access, memakai server-side encryption SSE-S3, dan memiliki lifecycle rule ringan untuk membersihkan incomplete multipart upload. Rule tersebut tidak menghapus lampiran yang sudah berhasil disimpan.

## Alur Request Utama

1. User membuka frontend di Vercel.
2. User login melalui Cognito.
3. Frontend menyimpan sesi dan bearer token.
4. Frontend memanggil API Gateway dengan token tersebut.
5. Lambda backend memverifikasi JWT dan menentukan role user.
6. Backend menerapkan RBAC lalu membaca atau menulis data ke DynamoDB.
7. Jika ada lampiran, backend menghasilkan presigned URL untuk S3.
8. Response dikembalikan ke frontend dalam format JSON yang konsisten.

## Audit Trail dan Aktivitas

OpsDesk menyimpan aktivitas tiket sebagai jejak audit append-only untuk kejadian penting seperti:

- tiket dibuat
- status diubah
- assignment diubah
- komentar ditambahkan
- lampiran ditambahkan

Riwayat ini membantu operator dan reviewer memahami apa yang terjadi pada sebuah tiket tanpa harus mencari konteks di luar sistem.

## Kenapa Arsitektur Ini Cocok Untuk OpsDesk

Arsitektur ini dipilih karena:

- cukup ringan untuk proyek helpdesk internal
- mudah dideploy dan diaudit
- memakai layanan managed AWS yang relevan
- mendukung pemisahan frontend, backend, auth, data, dan storage dengan jelas

## Batasan Saat Ini

Bagian berikut belum termasuk implementasi saat ini:

- notifikasi email operasional
- otomasi SLA atau eskalasi
- malware scanning attachment
- observability lanjutan seperti distributed tracing dan alerting otomatis

## Diagram Terkait

Visual pendukung yang relevan tersedia di [diagram pack](./diagram-pack.md):

- diagram arsitektur sistem
- user flow
- ticket lifecycle
- visual RBAC
- secure file upload flow
- audit trail / activity flow
