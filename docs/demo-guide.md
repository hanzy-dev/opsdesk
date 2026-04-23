# Demo Flow OpsDesk

Panduan ini membantu menyiapkan demo yang singkat, jelas, dan mudah dipahami oleh dosen, reviewer, recruiter, atau calon operator.

## Tujuan Demo

Demo OpsDesk sebaiknya menunjukkan dua hal sekaligus:

- ini adalah produk helpdesk yang punya model operasional jelas
- implementasinya benar-benar berjalan di cloud, bukan sekadar mockup UI

## Setup Akun Demo Yang Direkomendasikan

Gunakan tiga akun agar peran produk terlihat jelas:

### 1. Reporter

Yang perlu didemonstrasikan:

- login sebagai pelapor
- membuat tiket baru
- melihat tiket miliknya sendiri
- membuka detail tiket untuk melihat status, komentar, dan histori

Pesan yang ingin disampaikan:

- pelapor fokus pada pencatatan masalah, bukan assignment
- tiket tetap masuk ke sistem walaupun belum langsung ada operator yang mengambil

### 2. Agent

Yang perlu didemonstrasikan:

- membuka dashboard operasional
- melihat queue `Ditugaskan ke Saya`
- mengambil atau menerima tiket
- mengubah status tiket
- menambahkan komentar operasional

Pesan yang ingin disampaikan:

- agent bekerja dari antrean tiket, bukan dari chat yang tercecer
- assignment menunjukkan ownership yang jelas

### 3. Admin

Yang perlu didemonstrasikan:

- melihat seluruh antrean operasional
- melakukan assignment ke operator lain
- memantau progres lintas tiket

Pesan yang ingin disampaikan:

- admin memiliki visibilitas operasional yang lebih luas
- admin dapat membantu triage dan distribusi beban kerja

## Persiapan Sebelum Demo

Pastikan sebelum presentasi:

- frontend dapat diakses di `https://opsdesk-teal.vercel.app`
- endpoint health backend merespons baik di `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health`
- tiga akun demo sudah siap: reporter, agent, admin
- minimal ada beberapa tiket contoh agar dashboard, list, dan histori tidak kosong
- setidaknya satu user operasional sudah pernah login sehingga muncul di assignment picker

## Narasi Produk Yang Disarankan

Sebelum klik apa pun, buka dengan narasi singkat ini:

> OpsDesk dibuat untuk menggantikan pola pelaporan masalah yang tercecer di chat. Setiap isu dicatat sebagai tiket, bisa diprioritaskan, bisa ditugaskan ke operator tertentu, dan memiliki histori aktivitas yang jelas.

Narasi ini membantu audiens memahami mengapa aplikasi ini ada, bukan hanya teknologi apa yang dipakai.

## Alur Demo 3-5 Menit

### 1. Login sebagai Reporter

Tunjukkan:

- halaman login
- identitas akun pelapor

Narasi:

> User masuk melalui Amazon Cognito, jadi autentikasi dan role tidak di-hardcode di frontend.

### 2. Buat tiket baru

Tunjukkan:

- form `Buat Tiket`
- prioritas
- deskripsi masalah
- lampiran jika diperlukan

Narasi:

> Saat reporter membuat tiket, tiket masuk ke sistem lebih dulu. Belum tentu langsung ada assignee, karena keputusan pelaporan dipisahkan dari keputusan triage.

Ini adalah momen penting untuk menjelaskan kenapa "Create Ticket" tidak otomatis assign.

### 3. Tunjukkan tiket baru pada sistem

Tunjukkan:

- status awal tiket
- bahwa tiket sudah tercatat
- detail pelapor dan histori awal

Narasi:

> Sistem sudah punya catatan formal bahwa masalah ini ada, meskipun operator yang menangani belum dipilih.

### 4. Login sebagai Agent

Tunjukkan:

- dashboard operasional
- daftar tiket
- halaman `Ditugaskan ke Saya`

Narasi:

> Halaman `Ditugaskan ke Saya` adalah work queue pribadi operator. Yang tampil di sini adalah tiket yang saat ini menjadi tanggung jawab akun yang sedang login.

Jika tiket belum diassign, tunjukkan bahwa queue masih kosong atau tiket belum masuk ke sana.

### 5. Ambil atau assign tiket

Tunjukkan salah satu:

- agent mengambil tiket untuk dirinya sendiri
- admin menugaskan tiket ke agent tertentu

Narasi:

> Setelah tiket masuk, tim operasional melakukan triage. Di tahap inilah ownership ditetapkan.

### 6. Update status dan tambahkan komentar

Tunjukkan:

- perubahan status
- komentar tindak lanjut
- update timestamp

Narasi:

> Penanganan tidak lagi tersebar di chat karena progres dan komunikasi operasional tersimpan langsung pada tiket.

### 7. Tunjukkan riwayat aktivitas

Tunjukkan:

- entri pembuatan tiket
- entri assignment
- entri perubahan status
- entri komentar atau lampiran

Narasi:

> Riwayat aktivitas memberi audit trail yang membantu tim memahami apa yang sudah terjadi pada tiket ini.

### 8. Tunjukkan API docs

Buka:

`https://opsdesk-teal.vercel.app/api-docs`

Narasi:

> Selain antarmuka pengguna, kontrak API juga terdokumentasi. Ini membantu reviewer melihat kematangan engineering, bukan hanya visual aplikasi.

## Screenshot Yang Layak Diambil

Untuk portfolio atau presentasi, screenshot yang paling bernilai adalah:

1. halaman login
2. dashboard operasional
3. form `Buat Tiket`
4. daftar tiket dengan filter aktif
5. halaman `Ditugaskan ke Saya`
6. detail tiket dengan status, assignee, komentar, dan lampiran
7. riwayat aktivitas tiket
8. Swagger UI / API docs

Tambahan agar hasil screenshot terlihat final:

- gunakan state yang benar-benar representatif, jangan hanya halaman kosong
- pilih tiket yang menampilkan status, assignee, komentar, atau lampiran agar nilai produk terlihat
- untuk dashboard, gunakan data yang cukup agar KPI, chart, attention surface, dan workload surface terbaca
- hindari overclaim saat menjelaskan screenshot: tekankan bahwa OpsDesk adalah helpdesk internal ringan yang serius, bukan suite enterprise penuh

## Jalur Demo Yang Aman Jika Waktu Sangat Singkat

Jika waktu hanya 2-3 menit:

1. buka login
2. tunjukkan dashboard
3. buka satu tiket
4. jelaskan assignment dan queue `Ditugaskan ke Saya`
5. ubah status atau assignment
6. tutup dengan API docs

## Poin Teknis Yang Layak Disebut

Pilih 3-4 saja agar demo tetap fokus:

- Cognito untuk autentikasi dan role
- Go backend di AWS Lambda container image
- API Gateway HTTP API
- DynamoDB untuk tiket dan profil
- S3 privat dengan presigned URL untuk lampiran
- audit trail append-only pada aktivitas tiket

## Catatan Presentasi

- gunakan data demo yang sudah siap agar tidak menghabiskan waktu di setup
- hindari demo yang bergantung pada email real-time jika koneksi tidak stabil
- jika reviewer bertanya soal operator onboarding, arahkan ke [docs/operator-guide.md](./operator-guide.md)
- jika reviewer bertanya soal keterbatasan produk, jawab langsung:
  OpsDesk sudah kuat untuk alur helpdesk internal ringan, tetapi masih sengaja sederhana pada area notifikasi real-time, SLA enterprise, dan observability lanjutan
