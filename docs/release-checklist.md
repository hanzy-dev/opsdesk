# Release Checklist

Checklist ini dipakai untuk verifikasi rilis final OpsDesk pada baseline implementasi saat ini.

## Dokumen Yang Perlu Dicek

1. [README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/README.md)
2. [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md)
3. [docs/usage-guide.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/usage-guide.md)
4. [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md)
5. [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml)
6. [docs/operations.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/operations.md)

## Konfigurasi Yang Harus Cocok

1. Frontend production memakai `https://opsdesk-teal.vercel.app`.
2. Backend API base URL memakai `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`.
3. SAM parameter `FrontendOrigin` hanya mengizinkan domain frontend production.
4. SAM parameter `AppEnv` bernilai `dev`.
5. `frontend/.env.example` dan dokumentasi deployment memakai URL backend yang sama.
6. Tidak ada dokumentasi utama yang masih mengarahkan reviewer ke preview domain.
7. `infra/template.yaml` masih memakai origin CORS `https://opsdesk-teal.vercel.app`.

## Verifikasi Aplikasi

1. Buka halaman login dan pastikan field email/kata sandi tampil dengan benar.
2. Masuk menggunakan akun Cognito yang valid.
3. Pastikan user berada di group Cognito yang benar: `reporter`, `agent`, atau `admin`.
4. Buka dashboard dan daftar tiket.
5. Verifikasi ticket explorer:
   pencarian, filter status, filter prioritas, sortir, dan pagination memanggil data server-side dengan benar.
6. Verifikasi aksi sesuai role:
   reporter dapat membuat tiket dan hanya melihat tiket miliknya.
7. Verifikasi aksi sesuai role:
   agent dapat melihat tiket operasional, memperbarui status, dan menambah komentar.
8. Verifikasi assignment:
   agent atau admin dapat memperbarui penanggung jawab tiket ke dirinya sendiri atau ke operator lain yang eligible, lalu informasi petugas terbaru tersimpan.
9. Verifikasi aksi sesuai role:
   admin memiliki akses penuh.
10. Verifikasi lampiran:
   unggah file PDF/JPG/PNG/TXT/CSV/DOCX di bawah 10 MB, lalu pastikan lampiran muncul pada detail tiket.
11. Verifikasi buka lampiran:
   klik tombol buka dan pastikan URL presigned berhasil membuka file tanpa membuat bucket menjadi publik.
12. Verifikasi timeline aktivitas:
   detail tiket menampilkan entri saat tiket dibuat, status diubah, komentar ditambahkan, tiket ditugaskan, dan lampiran ditambahkan.
13. Verifikasi observability dasar:
   saat ada error dari backend, UI menampilkan `Kode referensi` jika `requestId` tersedia.
14. Verifikasi observability dasar:
   cari `requestId` yang sama di CloudWatch Lambda log dan pastikan request dapat ditelusuri.
15. Verifikasi dokumentasi API:
   buka `https://opsdesk-teal.vercel.app/api-docs`, pastikan Swagger UI tampil, base URL benar, dan YAML OpenAPI dapat dibuka.

## Verifikasi QA Visual dan Accessibility

1. Navigasikan halaman utama dengan keyboard:
   topbar, sidebar, dashboard cards, quick actions, dan dialog penting harus tetap bisa diakses dengan fokus yang terlihat jelas.
2. Pastikan komponen kustom seperti select, menu akun, tray notifikasi, dan dialog konfirmasi tetap nyaman dipakai tanpa mouse.
3. Pastikan empty state, loading state, dan error state pada dashboard, daftar tiket, detail tiket, dan help center memakai tone visual yang konsisten.
4. Pastikan warna badge status, prioritas, dan role masih konsisten pada surface yang paling sering muncul.
5. Jika perangkat memakai `prefers-reduced-motion`, pastikan animasi utama tidak mengganggu penggunaan.

## Checklist Demo dan Screenshot Final

1. Siapkan minimal:
   satu screenshot dashboard, satu daftar tiket, satu detail tiket, satu form buat tiket, dan satu login screen.
2. Pastikan data screenshot tidak memuat informasi pribadi nyata.
3. Ambil screenshot pada state yang paling representatif:
   dashboard berisi data, detail tiket dengan komentar/lampiran, dan queue operasional yang tidak kosong.
4. Untuk demo live, siapkan tiga akun:
   `reporter`, `agent`, dan `admin`.
5. Pastikan dokumentasi tidak mengklaim fitur yang belum ada, terutama notifikasi real-time penuh, SLA enterprise, dan observability lanjutan.

## Verifikasi Backend

1. Jalankan `curl https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health`.
2. Pastikan respons health mengembalikan environment `dev`.
3. Pastikan request browser dari frontend production tidak gagal karena CORS.
4. Pastikan respons error backend menyertakan `error.requestId` dan header `X-Request-Id` saat terjadi kegagalan.

## Verifikasi Lokal

1. Jalankan `go test ./...` dari folder `backend/`.
2. Jalankan `npm run test` dari folder `frontend/`.
3. Jalankan `npm run build` dari folder `frontend/`.

## Yang Sengaja Belum Dicentang Pada Batch Ini

- malware scanning
- observability lanjutan seperti tracing penuh dan alerting otomatis
- audit accessibility formal tingkat WCAG menyeluruh
