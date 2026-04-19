# Project Summary OpsDesk

## Ringkasan Singkat

OpsDesk adalah aplikasi helpdesk dan ticketing internal berbasis cloud yang dibangun untuk menangani alur dukungan operasional secara lebih tertib, aman, dan mudah ditelusuri. Proyek ini menggabungkan frontend React, backend Go, dan infrastruktur AWS serverless untuk menunjukkan implementasi full-stack yang nyata, bukan sekadar prototipe antarmuka.

## Masalah yang Diselesaikan

Dalam banyak alur dukungan internal, isu sering tersebar di chat, email, atau komunikasi informal. Akibatnya, status penanganan tidak jelas, penanggung jawab sulit dilacak, dan riwayat perubahan mudah hilang. OpsDesk menyatukan alur tersebut ke dalam satu sistem berbasis tiket yang memiliki:

- autentikasi dan pembagian peran
- kepemilikan tiket yang jelas
- assignment operasional
- komentar dan lampiran pendukung
- audit trail yang konsisten

## Mengapa Arsitekturnya Menarik

Nilai teknis utama OpsDesk ada pada kombinasi arsitektur yang pragmatis tetapi tetap modern:

- frontend React + Vite untuk antarmuka yang ringan dan responsif
- backend Go yang dideploy sebagai AWS Lambda container image
- API Gateway HTTP API untuk lapisan API publik
- DynamoDB untuk penyimpanan tiket dan profil
- Cognito untuk autentikasi dan role berbasis group
- S3 privat untuk lampiran dengan presigned URL
- AWS SAM untuk pengelolaan infrastruktur sebagai kode

Arsitektur ini menarik untuk portfolio karena menunjukkan pemahaman lintas layer: UI, API, auth, storage, deployment, dan dokumentasi operasional.

## Fitur Inti yang Sudah Diimplementasikan

- login dan manajemen sesi berbasis Amazon Cognito
- RBAC untuk `reporter`, `agent`, dan `admin`
- dashboard operasional dengan metrik, tiket terbaru, aktivitas terbaru, dan quick actions
- daftar tiket dengan search, filter, sorting, dan pagination di sisi server
- detail tiket dengan metadata, komentar, lampiran, status, assignment, dan timeline aktivitas
- assignment ke diri sendiri maupun ke operator lain yang berwenang
- profil akun dan pengaturan akun
- forgot password, reset password, dan change password
- API docs interaktif berbasis OpenAPI dan Swagger UI

## Keputusan Engineering yang Layak Disebut

- role tidak di-hardcode di frontend, tetapi diturunkan dari Cognito group dan diverifikasi ulang di backend
- daftar assignable users tidak langsung membaca Cognito saat runtime UI, tetapi memakai profil yang tersimpan di DynamoDB agar identitas tampil lebih ramah pengguna
- lampiran tidak dibuat publik; upload dan download dilakukan lewat presigned URL
- audit trail tiket bersifat append-only sehingga perubahan status, assignment, komentar, dan lampiran dapat ditelusuri
- pencarian dan pagination daftar tiket dipindahkan ke server agar perilaku aplikasi tetap konsisten untuk data yang lebih besar

## Mengapa Ini Kuat Sebagai Proyek Portfolio

OpsDesk kuat sebagai proyek portfolio karena menunjukkan lebih dari sekadar kemampuan membuat UI. Proyek ini memperlihatkan bahwa implementasi full-stack dapat disusun sebagai sistem yang hidup dan dapat diuji:

- ada deployment nyata
- ada autentikasi dan kontrol akses yang nyata
- ada workflow produk yang jelas
- ada integrasi cloud yang relevan
- ada dokumentasi operator dan API

Dengan kata lain, OpsDesk merepresentasikan proyek yang cukup matang untuk dibahas dalam konteks akademik, recruiter screening, maupun technical conversation yang lebih serius.

## Versi Singkat untuk Portfolio Page

OpsDesk adalah aplikasi helpdesk internal berbasis cloud yang saya bangun dengan React, Go, AWS Lambda, API Gateway, DynamoDB, Cognito, dan S3. Fokus proyek ini adalah workflow tiket yang nyata, termasuk RBAC, assignment operator, audit trail, lampiran aman, dashboard operasional, dan dokumentasi API, sehingga cocok ditampilkan sebagai proyek full-stack cloud-native yang siap dipresentasikan.
