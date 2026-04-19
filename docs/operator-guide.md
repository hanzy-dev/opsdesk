# Panduan Operator OpsDesk

Panduan ini ditujukan untuk admin aplikasi atau operator teknis yang mengelola akun pengguna OpsDesk pada deployment aktif.

## Konteks Deployment Aktif

- Stack SAM: `opsdesk-dev`
- Region: `ap-southeast-1`
- User Pool ID: `ap-southeast-1_sMFqei7IT`
- App Client ID: `3gtbp1t96krpj6t9hfon4ljujn`
- User Pool groups: `reporter`, `agent`, `admin`
- Profiles table: `opsdesk-dev-profiles`

Role aplikasi diselesaikan dari Cognito User Pool Group. Profil pengguna disimpan terpisah di DynamoDB untuk menyimpan `displayName`, `avatarUrl`, dan metadata yang dipakai aplikasi.

## Ringkasan Cara Kerja Role

Sumber kebenaran role:

- role **tidak** diubah dari halaman profil aplikasi
- role **ditentukan** dari group Cognito
- backend dan frontend sama-sama membaca group Cognito untuk menentukan `reporter`, `agent`, atau `admin`

Prioritas role:

1. `admin`
2. `agent`
3. `reporter`

Jika user tidak berada pada grup yang dikenali, sistem memperlakukannya sebagai `reporter`.

## Tambah User Baru

Flow yang paling aman untuk user internal baru:

1. Buat user di Cognito.
2. Tetapkan kata sandi awal.
3. Tambahkan user ke group role yang sesuai.
4. Minta user login ke OpsDesk minimal sekali.
5. Jika user perlu muncul pada picker assignment, pastikan profilnya sudah tersinkron ke aplikasi.

### Opsi 1: AWS CLI di Bash / Git Bash

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

### Opsi 2: AWS CLI di PowerShell

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
- Jika Anda ingin user langsung bisa masuk tanpa flow undangan, set kata sandi permanen seperti contoh di atas.
- Ganti `reporter` menjadi `agent` atau `admin` sesuai kebutuhan.

## Set Password atau Reset Password

Sistem mendukung dua pola yang berbeda.

### 1. Admin menetapkan password secara langsung

Gunakan ini jika operator ingin memberikan password awal atau mengganti password user tanpa menunggu email reset.

#### Bash / Git Bash

```bash
aws cognito-idp admin-set-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com \
  --password 'PasswordBaru123' \
  --permanent
```

#### PowerShell

```powershell
aws cognito-idp admin-set-user-password `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username user.baru@contoh.com `
  --password 'PasswordBaru123' `
  --permanent
```

### 2. User melakukan reset password sendiri

Flow ini memang sudah didukung aplikasi:

- halaman `Lupa Kata Sandi`
- halaman `Reset Kata Sandi`
- halaman `Pengaturan Akun` untuk change password saat user masih login

Gunakan flow ini jika email verifikasi Cognito user aktif dan dapat menerima kode verifikasi.

### 3. Admin memicu reset password Cognito

Jika Anda ingin Cognito mengirim alur reset ke user:

#### Bash / Git Bash

```bash
aws cognito-idp admin-reset-user-password \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com
```

#### PowerShell

```powershell
aws cognito-idp admin-reset-user-password `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username user.baru@contoh.com
```

## Set atau Ubah Role

Role dikelola melalui Cognito group. Gunakan kombinasi `admin-remove-user-from-group` dan `admin-add-user-to-group`.

### Contoh: ubah reporter menjadi agent

#### Bash / Git Bash

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

#### PowerShell

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

Jika ingin langsung mengatur role akhir dengan bersih, pastikan user hanya berada pada group yang memang diinginkan.

## Verifikasi User dan Role

### Cek group Cognito user

#### Bash / Git Bash

```bash
aws cognito-idp admin-list-groups-for-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com
```

#### PowerShell

```powershell
aws cognito-idp admin-list-groups-for-user `
  --region ap-southeast-1 `
  --user-pool-id ap-southeast-1_sMFqei7IT `
  --username user.baru@contoh.com
```

### Cek atribut user Cognito

```bash
aws cognito-idp admin-get-user \
  --region ap-southeast-1 \
  --user-pool-id ap-southeast-1_sMFqei7IT \
  --username user.baru@contoh.com
```

### Cek profil aplikasi

Setelah user login, backend akan melayani `GET /v1/profile/me`. Response ini menampilkan:

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

## Bagaimana User Menjadi Tersedia untuk Assignment

Ini bagian yang paling penting untuk operator.

Daftar assignable users **bukan** diambil langsung dari Cognito saat halaman detail tiket dibuka. Daftar tersebut dibaca dari tabel profil `opsdesk-dev-profiles` melalui endpoint:

```text
GET /v1/profiles/assignable
```

Aturan praktisnya:

1. User harus punya role Cognito `agent` atau `admin`.
2. User harus sudah memiliki record profil di DynamoDB.
3. Record profil itu harus menyimpan role `agent` atau `admin`.

### Kapan record profil dibuat

Record profil dibuat otomatis saat user belum punya profil lalu aplikasi memanggil `GET /v1/profile/me` untuk pertama kali.

Dalam praktiknya, ini biasanya terjadi saat user berhasil login dan frontend memuat profil akun.

### Kapan user langsung muncul di picker assignment

User baru biasanya akan muncul jika urutan berikut dipenuhi:

1. akun dibuat di Cognito
2. akun dimasukkan ke group `agent` atau `admin`
3. user login ke OpsDesk minimal satu kali

### Catatan penting saat role user diubah setelah pernah login

Jika user **sudah punya profil tersimpan** lalu role Cognito-nya diubah, response `GET /profile/me` memang akan menampilkan role terbaru, tetapi role yang tersimpan di tabel profil belum tentu langsung ikut diperbarui.

Langkah aman setelah promosi role, misalnya `reporter` menjadi `agent`:

1. ubah group Cognito user
2. minta user logout lalu login ulang
3. minta user buka halaman `Profil`
4. klik `Simpan Profil` sekali

Langkah `Simpan Profil` akan memanggil `PATCH /profile/me` dan menyimpan role terbaru ke profil DynamoDB. Setelah itu user akan ikut terbaca pada daftar assignable.

Jika Anda ingin memverifikasi lewat data, cek item user pada tabel `opsdesk-dev-profiles` dan pastikan field `role` bernilai `agent` atau `admin`.

## Troubleshooting Singkat

### User berhasil login tetapi tidak muncul di picker assignment

Periksa urutan berikut:

1. pastikan user ada di group `agent` atau `admin`
2. pastikan user sudah login minimal sekali
3. jika user baru saja ganti role, minta user buka `Profil` lalu klik `Simpan Profil`
4. pastikan item profilnya sudah ada di tabel `opsdesk-dev-profiles`

### User bisa login tetapi menu operasional tidak muncul

Biasanya berarti JWT tidak membawa group yang sesuai. Cek:

- group Cognito user
- hasil `admin-list-groups-for-user`
- hasil endpoint `/v1/auth/me`

### Forgot password tidak berjalan

Gunakan salah satu opsi ini:

- reset langsung lewat `admin-set-user-password --permanent`
- atau cek apakah email user aktif menerima kode verifikasi Cognito

### User lama masih terbaca dengan role lama

Penyebab paling umum adalah profil DynamoDB belum tersinkron ulang. Minta user:

1. login ulang
2. buka `Profil`
3. klik `Simpan Profil`

## Referensi Terkait

- README utama: [../README.md](../README.md)
- Setup dan deployment: [./setup.md](./setup.md)
- Panduan penggunaan: [./usage-guide.md](./usage-guide.md)
- API docs viewer: `https://opsdesk-teal.vercel.app/api-docs`
