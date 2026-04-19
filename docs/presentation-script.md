# Script Presentasi OpsDesk

Dokumen ini membantu menjelaskan OpsDesk dalam waktu 3-5 menit dengan alur yang padat, jelas, dan tetap teknis.

## Tujuan Presentasi

Menjelaskan bahwa OpsDesk adalah proyek full-stack cloud yang matang secara engineering, bukan hanya demo UI.

## Script 3-5 Menit

### Pembukaan

> Saya akan mempresentasikan OpsDesk, yaitu aplikasi helpdesk dan ticketing internal berbasis cloud yang saya bangun untuk menangani alur pelaporan, penugasan, dan pelacakan isu operasional secara lebih rapi.

### Masalah dan Konteks

> Masalah yang ingin saya jawab adalah kondisi ketika isu operasional masih tersebar di chat atau komunikasi informal, sehingga status penanganan, penanggung jawab, dan riwayat perubahan sulit ditelusuri. Karena itu, saya membangun OpsDesk sebagai satu sistem tiket terpusat dengan autentikasi, pembagian peran, assignment, komentar, lampiran, dan audit trail.

### Arsitektur

> Dari sisi arsitektur, frontend dibangun dengan React, Vite, dan TypeScript lalu dideploy di Vercel. Backend dibangun dengan Go dan dideploy sebagai AWS Lambda container image. API dipublikasikan melalui AWS API Gateway HTTP API. Data tiket dan profil disimpan di DynamoDB, autentikasi menggunakan Amazon Cognito, dan lampiran menggunakan S3 privat melalui presigned URL. Infrastruktur dikelola menggunakan AWS SAM.

### Walkthrough Fitur

> Setelah login menggunakan Cognito, pengguna masuk ke dashboard operasional yang menampilkan ringkasan tiket, aktivitas terbaru, dan quick actions. Dari daftar tiket, pengguna bisa melakukan pencarian, filter, sorting, dan pagination yang semuanya diproses di sisi server. Pada halaman detail tiket, tersedia metadata tiket, assignment, perubahan status, komentar, lampiran, dan timeline aktivitas.

> Role aplikasi dibagi menjadi reporter, agent, dan admin. Reporter fokus pada pembuatan dan pemantauan tiket miliknya. Agent dan admin memiliki akses operasional, termasuk memperbarui status dan mengelola assignment tiket. Pada versi saat ini, assignment juga sudah mendukung penugasan ke operator lain yang berwenang.

### Engineering Highlights

> Hal yang menurut saya paling penting dari proyek ini bukan hanya fitur visualnya, tetapi keputusan engineering di baliknya. Role tidak di-hardcode di frontend, melainkan diturunkan dari Cognito group dan diverifikasi di backend. Daftar tiket sudah memakai search, sorting, dan pagination server-side agar skalanya lebih realistis. Lampiran tidak dibuat publik karena akses file memakai presigned URL. Selain itu, perubahan tiket dicatat dalam audit trail append-only agar riwayat penanganan lebih mudah ditelusuri.

### Penutup

> Secara keseluruhan, OpsDesk menunjukkan bagaimana sebuah aplikasi helpdesk internal bisa dibangun dengan pendekatan cloud-native yang tetap ringkas tetapi realistis. Proyek ini menggabungkan frontend, backend, auth, storage, deployment, dan dokumentasi operator dalam satu sistem yang siap dipresentasikan maupun dijadikan portfolio.

## Versi Lebih Ringkas Jika Waktu Mendekati 3 Menit

> OpsDesk adalah aplikasi helpdesk internal berbasis cloud yang saya bangun dengan React, Go, AWS Lambda, API Gateway, DynamoDB, Cognito, S3, dan AWS SAM. Proyek ini mendukung autentikasi nyata, RBAC, dashboard operasional, workflow tiket, assignment operator, audit trail, dan attachment aman. Nilai utamanya ada pada integrasi full-stack dan keputusan engineering seperti verifikasi role di backend, server-side ticket queries, serta presigned URL untuk file attachment.

## Poin yang Bisa Ditekankan Sesuai Audiens

### Jika audiens lebih akademik

- alasan memilih arsitektur serverless
- pemisahan concern antara frontend, backend, dan infrastruktur
- kontrol akses berbasis role

### Jika audiens lebih recruiter-oriented

- proyek sudah live
- ada dokumentasi operator dan API
- menunjukkan pemahaman full-stack dan cloud integration

## Kemungkinan Tanya Jawab

### Kenapa memilih AWS Lambda dan SAM?

Jawaban singkat:

> Karena kebutuhan proyek ini cocok dengan arsitektur serverless yang ringan, mudah dideploy, dan cukup representatif untuk menunjukkan integrasi cloud-native tanpa menambah kompleksitas yang tidak perlu.

### Bagaimana role dikelola?

Jawaban singkat:

> Role berasal dari Cognito group `reporter`, `agent`, dan `admin`. Frontend memakai role untuk mengatur pengalaman pengguna, sedangkan backend tetap memverifikasi ulang izin akses agar kontrol akses tidak hanya bergantung pada UI.

### Bagaimana attachment diamankan?

Jawaban singkat:

> File disimpan di bucket S3 privat. Upload dan download dilakukan menggunakan presigned URL, jadi file tidak perlu dibuat publik.

### Bagaimana operator assignment bekerja?

Jawaban singkat:

> Assignment hanya tersedia untuk role operasional. Daftar operator dibaca dari profil aplikasi yang tersimpan di DynamoDB dan disinkronkan dengan identitas Cognito, sehingga nama yang tampil lebih ramah dibanding hanya memakai ID mentah.

### Apa yang membuat proyek ini menarik untuk portfolio?

Jawaban singkat:

> Karena proyek ini tidak berhenti di antarmuka. Ada deployment nyata, auth, RBAC, backend API, storage, audit trail, dan dokumentasi yang semuanya saling terhubung.
