# Panduan Operator OpsDesk

Dokumen ini ditujukan untuk admin aplikasi, operator teknis, atau reviewer yang perlu memahami bagaimana akun dan role OpsDesk dikelola pada deployment aktif.

## Konteks Deployment Aktif

- Stack SAM: `opsdesk-dev`
- Region: `ap-southeast-1`
- User Pool ID: `ap-southeast-1_sMFqei7IT`
- App Client ID: `3gtbp1t96krpj6t9hfon4ljujn`
- Cognito groups: `reporter`, `agent`, `admin`
- Profiles table: `opsdesk-dev-profiles`

## Prinsip Operasional Yang Perlu Dipahami

### 1. Sumber kebenaran role ada di Cognito

Role aplikasi tidak diatur dari halaman profil frontend. Role diselesaikan dari Cognito User Pool Group:

1. `admin`
2. `agent`
3. `reporter`

Jika user tidak berada pada group yang dikenali, sistem akan memperlakukannya sebagai `reporter`.

### 2. Profil aplikasi disimpan terpisah di DynamoDB

OpsDesk menyimpan profil pengguna di tabel `opsdesk-dev-profiles` untuk data seperti:

- `displayName`
- `avatarUrl`
- `email`
- `role` yang dipakai aplikasi untuk kebutuhan operasional tertentu

### 3. User operasional baru tidak otomatis muncul di daftar assignment hanya karena sudah ada di Cognito

Daftar assignable users dibaca dari endpoint:

```text
GET /v1/profiles/assignable
```

Endpoint ini mengambil data dari tabel profil aplikasi, bukan langsung dari Cognito. Karena itu, user baru biasanya baru muncul di picker assignment setelah:

1. akun dibuat di Cognito
2. akun dimasukkan ke group `agent` atau `admin`
3. user login ke OpsDesk minimal sekali sehingga profilnya tersimpan

## Alur Tambah User Baru

Alur aman yang direkomendasikan:

1. Buat user di Cognito.
2. Set password permanen atau kirim flow reset.
3. Tambahkan user ke group yang sesuai.
4. Minta user login ke OpsDesk minimal satu kali.
5. Jika user adalah operator, verifikasi bahwa profilnya sudah tersinkron sehingga bisa muncul di assignment picker.

## Matriks Role Praktis

Matriks ini sengaja ditulis berdasarkan implementasi saat ini, bukan asumsi future enterprise feature.

| Kemampuan praktis | Reporter | Agent | Admin |
| --- | --- | --- | --- |
| Login ke aplikasi | Ya | Ya | Ya |
| Melihat dashboard operasional | Tidak | Ya | Ya |
| Melihat daftar tiket operasional | Tidak | Ya | Ya |
| Melihat tiket milik sendiri | Ya | Ya | Ya |
| Membuat tiket baru | Ya | Tidak | Ya |
| Membuka Help Center, Profil, dan Pengaturan | Ya | Ya | Ya |
| Mengubah status tiket yang bisa diakses | Tidak | Ya | Ya |
| Menambahkan komentar pada tiket yang bisa diakses | Ya | Ya | Ya |
| Mengelola assignment tiket | Tidak | Ya | Ya |
| Melihat queue `Ditugaskan ke Saya` | Tidak | Ya | Ya |

Catatan penting:

- `agent` dan `admin` adalah role operasional.
- `reporter` tetap dapat login dan mengelola identitas akun, tetapi tidak mendapat workspace operasional penuh.
- Assignment picker membaca profil aplikasi yang sudah tersimpan, bukan daftar Cognito mentah saat runtime.

## Opsi 1: Membuat User Via AWS Console

Langkah ini cocok untuk demo, onboarding cepat, atau operator yang tidak memakai terminal.

### Buat user baru

1. Buka AWS Console.
2. Masuk ke layanan Amazon Cognito.
3. Pilih User Pool `opsdesk-dev-users` atau pool dengan ID `ap-southeast-1_sMFqei7IT`.
4. Buka menu `Users`.
5. Pilih `Create user`.
6. Masukkan email user sebagai username.
7. Isi atribut email dan aktifkan email sebagai verified jika diperlukan.
8. Jika tidak ingin mengirim email undangan otomatis, pilih opsi yang setara dengan membuat user tanpa delivery default lalu lanjutkan dengan set password manual.

### Set password permanen

Setelah user dibuat:

1. Buka detail user.
2. Pilih aksi untuk menetapkan password.
3. Set password permanen agar user bisa langsung login tanpa flow password sementara.

### Tambahkan ke group role

1. Buka tab atau bagian `Groups`.
2. Tambahkan user ke salah satu group berikut:
   - `reporter`
   - `agent`
   - `admin`

### Verifikasi hasil

Pastikan:

- user berada pada group yang benar
- email sesuai
- akun dalam status aktif

### Contoh setup akun `Reporter`

Gunakan langkah Console di atas, lalu pastikan:

1. username memakai email reviewer, misalnya `demo.reporter@contoh.com`
2. user masuk ke group `reporter`
3. user dapat login dan membuka:
   - halaman login
   - buat tiket
   - tiket saya

### Contoh setup akun `Agent`

Gunakan langkah Console di atas, lalu pastikan:

1. username memakai email reviewer, misalnya `demo.agent@contoh.com`
2. user masuk ke group `agent`
3. user login ke aplikasi minimal satu kali
4. bila perlu assignment lintas operator saat demo, buka `Profil` lalu klik `Simpan Profil` agar record profil ikut sinkron

### Contoh setup akun `Admin`

Gunakan langkah Console di atas, lalu pastikan:

1. username memakai email reviewer, misalnya `demo.admin@contoh.com`
2. user masuk ke group `admin`
3. user login ke aplikasi minimal satu kali
4. gunakan akun ini untuk reviewer yang perlu melihat visibilitas operasional paling luas

## Opsi 2: Membuat User Via AWS CLI

Contoh berikut praktis untuk operator teknis dan mudah dicopy.

### Contoh `Reporter` via Bash / Git Bash

```bash
aws cognito-idp admin-create-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.reporter@contoh.com \
  --user-attributes Name=email,Value=demo.reporter@contoh.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.reporter@contoh.com \
  --password 'PasswordAwal123' \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.reporter@contoh.com \
  --group-name reporter
```

### Contoh `Agent` via Bash / Git Bash

```bash
aws cognito-idp admin-create-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.agent@contoh.com \
  --user-attributes Name=email,Value=demo.agent@contoh.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.agent@contoh.com \
  --password 'PasswordAwal123' \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.agent@contoh.com \
  --group-name agent
```

### Contoh `Admin` via Bash / Git Bash

```bash
aws cognito-idp admin-create-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.admin@contoh.com \
  --user-attributes Name=email,Value=demo.admin@contoh.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.admin@contoh.com \
  --password 'PasswordAwal123' \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username demo.admin@contoh.com \
  --group-name admin
```

### Contoh `Reporter` via PowerShell

```powershell
aws cognito-idp admin-create-user `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.reporter@contoh.com `
  --user-attributes Name=email,Value=demo.reporter@contoh.com Name=email_verified,Value=true `
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.reporter@contoh.com `
  --password 'PasswordAwal123' `
  --permanent

aws cognito-idp admin-add-user-to-group `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.reporter@contoh.com `
  --group-name reporter
```

### Contoh `Agent` via PowerShell

```powershell
aws cognito-idp admin-create-user `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.agent@contoh.com `
  --user-attributes Name=email,Value=demo.agent@contoh.com Name=email_verified,Value=true `
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.agent@contoh.com `
  --password 'PasswordAwal123' `
  --permanent

aws cognito-idp admin-add-user-to-group `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.agent@contoh.com `
  --group-name agent
```

### Contoh `Admin` via PowerShell

```powershell
aws cognito-idp admin-create-user `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.admin@contoh.com `
  --user-attributes Name=email,Value=demo.admin@contoh.com Name=email_verified,Value=true `
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.admin@contoh.com `
  --password 'PasswordAwal123' `
  --permanent

aws cognito-idp admin-add-user-to-group `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username demo.admin@contoh.com `
  --group-name admin
```

Catatan:

- `--message-action SUPPRESS` berarti Cognito tidak mengirim undangan otomatis.
- Pada implementasi saat ini, hanya `agent` dan `admin` yang bisa menerima assignment tiket.
- Untuk akun demo reviewer, lebih aman menyiapkan email terpisah per role daripada sering memindahkan satu akun antar group.

## Command Referensi Inti

### 1. Create user

```bash
aws cognito-idp admin-create-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --user-attributes Name=email,Value=user.baru@contoh.com Name=email_verified,Value=true \
  --message-action SUPPRESS
```

### 2. Set permanent password

```bash
aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --password 'PasswordAwal123' \
  --permanent
```

### 3. Add user to group

```bash
aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --group-name agent
```

### 4. Verify user detail

```bash
aws cognito-idp admin-get-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com
```

### 5. List groups for user

```bash
aws cognito-idp admin-list-groups-for-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com
```

## Mengubah Role User

Role dikelola melalui Cognito group. Jika ingin memindahkan user dari `reporter` ke `agent`, lakukan remove lalu add.

### Bash / Git Bash

```bash
aws cognito-idp admin-remove-user-from-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --group-name reporter

aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --group-name agent
```

### PowerShell

```powershell
aws cognito-idp admin-remove-user-from-group `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username user.baru@contoh.com `
  --group-name reporter

aws cognito-idp admin-add-user-to-group `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username user.baru@contoh.com `
  --group-name agent
```

## Reset Password

### Set password baru secara langsung

```bash
aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --password 'PasswordBaru123' \
  --permanent
```

### Kirim flow reset password Cognito

```bash
aws cognito-idp admin-reset-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com
```

## Verifikasi Sinkronisasi Profil Aplikasi

Setelah user login ke aplikasi, backend akan melayani:

```text
GET /v1/profile/me
```

Response ini memperlihatkan data seperti:

- `subject`
- `displayName`
- `email`
- `avatarUrl`
- `role`

Untuk verifikasi cepat melalui API:

```bash
curl -H "Authorization: Bearer <id-token>" \
  https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1/profile/me
```

## Panduan Akun Demo Reviewer

Untuk demo atau review, siapkan minimal tiga akun:

### 1. Akun `Reporter`

Gunakan untuk:

- login reviewer dari sudut pandang pelapor
- membuat tiket baru
- menunjukkan tiket milik sendiri
- menunjukkan detail tiket tanpa menu operasional

### 2. Akun `Agent`

Gunakan untuk:

- membuka dashboard operasional
- membuka `Daftar Tiket`
- membuka `Ditugaskan ke Saya`
- update status dan komentar

Catatan:

- minta akun ini login minimal sekali sebelum demo
- jika akun baru dipromosikan dari `reporter`, minta user buka `Profil` lalu klik `Simpan Profil`

### 3. Akun `Admin`

Gunakan untuk:

- menunjukkan visibilitas operasional paling luas
- membantu triage
- menunjukkan assignment dan distribusi kerja

Checklist sebelum demo:

- semua akun bisa login
- password sudah permanen atau flow reset sudah selesai
- akun `agent` dan `admin` sudah pernah login ke aplikasi
- ada minimal satu tiket terbuka agar reviewer tidak melihat state kosong sepanjang demo

## Mengapa User Tidak Langsung Muncul Di Assignment Picker

Ini adalah bagian paling penting untuk operator.

Assignment picker tidak membaca daftar operator langsung dari Cognito pada saat halaman detail dibuka. Sistem membaca daftar profile yang sudah tersimpan dan hanya mengambil role `agent` atau `admin`.

Artinya, user operasional akan muncul jika:

1. role Cognito-nya `agent` atau `admin`
2. user sudah punya record profil di `opsdesk-dev-profiles`
3. field `role` pada record profil tersebut juga bernilai `agent` atau `admin`

## Langkah Aman Setelah Promosi Role

Jika user sebelumnya sudah pernah login sebagai `reporter`, lalu sekarang dipromosikan menjadi `agent`, lakukan langkah berikut agar data assignment ikut sinkron:

1. ubah group Cognito user
2. minta user logout lalu login ulang
3. minta user buka halaman `Profil`
4. klik `Simpan Profil` sekali

Langkah ini akan memanggil `PATCH /profile/me` dan menyimpan role terbaru ke profil DynamoDB.

## Troubleshooting Singkat

### User berhasil login tetapi tidak muncul di assignment picker

Periksa hal berikut:

1. user ada di group `agent` atau `admin`
2. user sudah login minimal sekali
3. setelah perubahan role, user sudah membuka `Profil` lalu klik `Simpan Profil`
4. record profil user ada di tabel `opsdesk-dev-profiles`

### User bisa login tetapi menu operasional tidak muncul

Biasanya JWT tidak membawa group yang sesuai. Verifikasi:

- hasil `admin-list-groups-for-user`
- hasil endpoint `/v1/auth/me`
- user sudah logout lalu login ulang setelah perubahan group

### User lama masih terbaca dengan role lama

Biasanya profil DynamoDB belum tersinkron ulang. Minta user:

1. login ulang
2. buka `Profil`
3. klik `Simpan Profil`

### User dibuat di Cognito tetapi reviewer tetap gagal login

Periksa:

1. password sudah di-set sebagai permanen atau flow reset selesai
2. username yang dipakai sama dengan email yang dibuat di Cognito
3. app client frontend masih mengarah ke User Pool deployment aktif
4. user tidak berada pada status yang masih menunggu challenge lama

## Referensi

- README utama: [../README.md](../README.md)
- Panduan penggunaan: [./usage-guide.md](./usage-guide.md)
- Panduan demo: [./demo-guide.md](./demo-guide.md)
- Setup dan deployment: [./setup.md](./setup.md)
