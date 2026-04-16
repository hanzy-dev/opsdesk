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

1. Frontend production memakai `https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`.
2. Backend API base URL memakai `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`.
3. SAM parameter `FrontendOrigin` hanya mengizinkan domain frontend production.
4. SAM parameter `AppEnv` bernilai `dev`.
5. `frontend/.env.example` dan dokumentasi deployment memakai URL backend yang sama.
6. Tidak ada dokumentasi utama yang masih mengarahkan reviewer ke preview domain.
7. `infra/template.yaml` masih memakai origin CORS `https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`.

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
   agent atau admin dapat menekan "Tugaskan ke Saya" dan informasi petugas tersimpan.
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
