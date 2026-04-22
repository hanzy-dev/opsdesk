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

## Opsi 2: Membuat User Via AWS CLI

Contoh berikut praktis untuk operator teknis dan mudah dicopy.

### Bash / Git Bash

```bash
aws cognito-idp admin-create-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --user-attributes Name=email,Value=user.baru@contoh.com Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --password 'PasswordAwal123' \
  --permanent

aws cognito-idp admin-add-user-to-group \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --group-name reporter
```

### PowerShell

```powershell
aws cognito-idp admin-create-user `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username user.baru@contoh.com `
  --user-attributes Name=email,Value=user.baru@contoh.com Name=email_verified,Value=true `
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username user.baru@contoh.com `
  --password 'PasswordAwal123' `
  --permanent

aws cognito-idp admin-add-user-to-group `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username user.baru@contoh.com `
  --group-name reporter
```

Catatan:

- `--message-action SUPPRESS` berarti Cognito tidak mengirim undangan otomatis.
- Ganti `reporter` menjadi `agent` atau `admin` sesuai kebutuhan.
- Pada implementasi saat ini, hanya `agent` dan `admin` yang bisa menerima assignment tiket.

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

### User lama masih terbaca dengan role lama

Biasanya profil DynamoDB belum tersinkron ulang. Minta user:

1. login ulang
2. buka `Profil`
3. klik `Simpan Profil`

## Referensi

- README utama: [../README.md](../README.md)
- Panduan penggunaan: [./usage-guide.md](./usage-guide.md)
- Panduan demo: [./demo-guide.md](./demo-guide.md)
- Setup dan deployment: [./setup.md](./setup.md)
