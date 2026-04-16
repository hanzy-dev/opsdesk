# Release Checklist

Checklist ini dipakai untuk verifikasi deployment dan baseline rilis OpsDesk pada batch saat ini.

## Dokumen Yang Perlu Dicek

1. [README.md](/d:/Semester%206/Cloud%20Computing/opsdesk/README.md)
2. [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md)
3. [docs/usage-guide.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/usage-guide.md)
4. [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md)
5. [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml)

## Konfigurasi Yang Harus Cocok

1. Frontend production memakai `https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`.
2. Backend API base URL memakai `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`.
3. SAM parameter `FrontendOrigin` hanya mengizinkan domain frontend production.
4. SAM parameter `AppEnv` bernilai `dev`.
5. `frontend/.env.example` dan dokumentasi deployment memakai URL backend yang sama.

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
10. Verifikasi timeline aktivitas:
   detail tiket menampilkan entri saat tiket dibuat, status diubah, komentar ditambahkan, dan tiket ditugaskan.

## Verifikasi Backend

1. Jalankan `curl https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health`.
2. Pastikan respons health mengembalikan environment `dev`.
3. Pastikan request browser dari frontend production tidak gagal karena CORS.

## Verifikasi Lokal

1. Jalankan `go test ./...` dari folder `backend/`.
2. Jalankan `npm run test` dari folder `frontend/`.
3. Jalankan `npm run build` dari folder `frontend/`.

## Yang Sengaja Belum Dicentang Pada Batch Ini

- attachment
- observability lanjutan
