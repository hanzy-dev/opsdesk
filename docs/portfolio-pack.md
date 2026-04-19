# Portfolio Pack OpsDesk

Dokumen ini adalah paket ringkas untuk kebutuhan portfolio, presentasi dosen, recruiter conversation, dan persiapan demo. Gunakan dokumen ini sebagai titik masuk, lalu ambil aset yang paling sesuai dari dokumen turunan.

## Isi Paket

- Ringkasan proyek: [project-summary.md](./project-summary.md)
- Bullet CV dan LinkedIn: [cv-linkedin-bullets.md](./cv-linkedin-bullets.md)
- Script presentasi 3-5 menit: [presentation-script.md](./presentation-script.md)
- Demo flow umum: [demo-guide.md](./demo-guide.md)

## Posisi OpsDesk Sebagai Proyek Portfolio

OpsDesk layak ditampilkan sebagai proyek portfolio karena memperlihatkan kombinasi yang jarang lengkap dalam satu proyek mahasiswa atau early-career:

- produk web yang benar-benar terdeploy
- arsitektur cloud-native yang masuk akal
- autentikasi dan RBAC yang nyata
- ticket workflow dengan audit trail
- integrasi file attachment yang aman
- dokumentasi operator dan API yang matang

Proyek ini tidak berhenti di antarmuka. Nilai utamanya ada pada keputusan engineering yang menyatukan frontend, backend, cloud infra, dan dokumentasi operasional menjadi satu sistem yang koheren.

## Narasi Utama yang Paling Kuat

Jika hanya boleh menyampaikan satu kalimat inti:

> OpsDesk adalah aplikasi helpdesk internal berbasis cloud yang saya bangun dengan React, Go, AWS Lambda, API Gateway, DynamoDB, Cognito, dan S3 untuk menunjukkan implementasi helpdesk modern dengan autentikasi nyata, RBAC, assignment workflow, audit trail, dan dokumentasi operasional yang siap dipresentasikan.

## Sudut Cerita yang Bisa Dipilih

Pilih fokus sesuai audiens:

### Untuk dosen

Tekankan:

- alur sistem end-to-end
- arsitektur cloud dan integrasi AWS
- alasan pemilihan stack
- bagaimana RBAC dan audit trail diterapkan

### Untuk recruiter

Tekankan:

- proyek live, bukan hanya local prototype
- frontend, backend, dan infra dikerjakan secara terintegrasi
- ada ownership workflow, assignment, attachment, dan API docs
- dokumentasi dan deployment menunjukkan kedewasaan engineering

### Untuk portfolio web

Tekankan:

- apa masalah yang diselesaikan
- stack yang dipakai
- fitur inti yang benar-benar berjalan
- apa yang membuat proyek ini technically credible

## Showcase Checklist

Checklist ini membantu demo tetap rapi saat kondisi presentasi terbatas.

### Sebelum Presentasi

- pastikan frontend `https://opsdesk-teal.vercel.app` dapat dibuka
- pastikan endpoint health backend merespons
- siapkan minimal satu akun `reporter`
- siapkan minimal satu akun `agent` atau `admin`
- siapkan 3-5 tiket contoh dengan status dan assignee yang bervariasi
- siapkan satu tiket yang sudah punya komentar dan lampiran
- siapkan satu tiket yang bisa dipakai untuk demo perubahan assignment
- buka tab cadangan untuk API docs
- simpan link penting di satu catatan singkat

### Urutan Showcase yang Disarankan

1. halaman login
2. dashboard
3. daftar tiket
4. detail tiket
5. assignment atau perubahan status
6. komentar dan lampiran
7. API docs

### Kalimat Pendamping Saat Menunjukkan Halaman

Saat login:

> Aplikasi ini memakai Cognito untuk autentikasi, jadi role dan session management tidak dibuat secara manual di frontend.

Saat dashboard:

> Dashboard dibuat sebagai command center operasional agar kondisi tiket dan aktivitas terbaru langsung terbaca.

Saat daftar tiket:

> Pencarian, filter, sorting, dan pagination dilakukan di sisi server supaya perilakunya tetap konsisten saat data membesar.

Saat detail tiket:

> Halaman detail menjadi pusat workflow: metadata, assignment, komentar, lampiran, dan audit trail berada di satu tempat.

Saat assignment:

> Penugasan hanya muncul untuk role yang berwenang, dan daftar operator diambil dari profil aplikasi yang tersinkron dengan identitas Cognito.

Saat API docs:

> Saya juga menjaga kontrak API tetap terdokumentasi dengan OpenAPI dan viewer interaktif.

### Fallback Jika Internet atau Demo Tidak Ideal

- jika login lambat, langsung jelaskan arsitektur sambil menunggu session restore
- jika data demo kurang menarik, fokus ke dashboard, detail tiket, dan API docs
- jika upload lampiran berisiko karena koneksi, cukup tunjukkan daftar lampiran yang sudah ada
- jika ingin menghindari perubahan data live, gunakan tiket yang memang disiapkan untuk demo dan cukup ubah assignment atau status satu kali
- jika frontend bermasalah sesaat, gunakan [presentation-script.md](./presentation-script.md) dan [project-summary.md](./project-summary.md) sebagai cadangan narasi

## Aset yang Paling Cocok Per Kebutuhan

- CV dan LinkedIn: [cv-linkedin-bullets.md](./cv-linkedin-bullets.md)
- Portfolio page atau project section: [project-summary.md](./project-summary.md)
- Presentasi dosen 3-5 menit: [presentation-script.md](./presentation-script.md)
- Persiapan demo langsung: [demo-guide.md](./demo-guide.md)

## Catatan Personalisasi

Bagian yang paling layak Anda personalisasi sendiri:

- porsi kontribusi pribadi, jika proyek dikerjakan tim
- detail tantangan yang paling berkesan bagi Anda
- metrik kecil yang jujur, misalnya jumlah komponen, cakupan fitur, atau bagian stack yang paling Anda kerjakan
