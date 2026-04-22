# OpsDesk Diagram Pack

Dokumen ini mengumpulkan diagram visual utama OpsDesk dalam format Mermaid agar mudah dibaca di GitHub, mudah dirawat di repository, dan tetap selaras dengan implementasi saat ini.

## Tujuan

Diagram-diagram di bawah ini dirancang untuk membantu dosen, reviewer, recruiter, dan anggota tim memahami OpsDesk secara cepat dari sisi:

- arsitektur sistem
- alur pengguna
- lifecycle tiket
- RBAC
- alur upload lampiran yang aman
- audit trail dan histori aktivitas

## 1. Diagram Arsitektur Sistem

Diagram ini menunjukkan komponen utama yang memang aktif pada implementasi saat ini.

```mermaid
flowchart LR
    user["Pengguna<br/>Reporter / Agent / Admin"]
    frontend["Frontend<br/>React + Vite<br/>Vercel"]
    docs["API Docs<br/>Swagger UI<br/>/api-docs"]
    cognito["Amazon Cognito<br/>Autentikasi + Group Role"]
    apigw["API Gateway<br/>HTTP API"]
    lambda["Backend Go<br/>AWS Lambda Container"]
    ddbTickets["DynamoDB<br/>Tabel Tiket"]
    ddbProfiles["DynamoDB<br/>Tabel Profil"]
    s3["Amazon S3 Privat<br/>Lampiran"]

    user -->|"Akses web"| frontend
    user -->|"Login"| cognito
    frontend -->|"Gunakan sesi JWT"| cognito
    frontend -->|"Panggil endpoint /v1"| apigw
    frontend -->|"Buka dokumentasi API"| docs
    docs -->|"Menggunakan kontrak OpenAPI"| apigw
    apigw --> lambda
    lambda -->|"Verifikasi token dan role"| cognito
    lambda -->|"Baca/tulis tiket"| ddbTickets
    lambda -->|"Baca/tulis profil"| ddbProfiles
    lambda -->|"Buat presigned URL"| s3
    frontend -.->|"Upload/download via URL bertanda tangan"| s3
```

## 2. Diagram User Flow

Diagram ini menunjukkan alur produk dari sudut pandang penggunaan utama. Bagian pentingnya adalah: membuat tiket tidak otomatis berarti tiket langsung diassign.

```mermaid
flowchart LR
    login["Login melalui Cognito"]
    create["Reporter atau Admin<br/>membuat tiket"]
    queue["Tiket masuk ke sistem<br/>status awal open"]
    decision{"Apakah tiket<br/>sudah diassign?"}
    triage["Agent atau Admin<br/>melakukan triage"]
    assign["Ambil sendiri atau<br/>assign ke operator lain"]
    workqueue["Muncul pada queue<br/>Ditugaskan ke Saya"]
    handle["Status diperbarui,<br/>komentar ditambahkan,<br/>lampiran dikelola"]
    done["Tiket selesai ditangani"]

    login --> create
    create --> queue
    queue --> decision
    decision -->|"Belum"| triage
    triage --> assign
    assign --> workqueue
    workqueue --> handle
    handle --> done
    decision -->|"Sudah"| workqueue
```

## 3. Diagram Ticket Lifecycle

Lifecycle saat ini masih sederhana dan jujur terhadap implementasi yang ada. Status yang benar-benar dipakai sekarang adalah:

- `open`
- `in_progress`
- `resolved`

```mermaid
stateDiagram-v2
    [*] --> Open: Tiket dibuat
    Open --> InProgress: Agent/Admin mulai menangani
    Open --> Resolved: Diselesaikan langsung
    InProgress --> Resolved: Penanganan selesai
    InProgress --> Open: Dikembalikan ke terbuka
    Resolved --> InProgress: Perlu tindak lanjut lagi
    Resolved --> Open: Dibuka kembali
```

Catatan:

- assignment bukan status terpisah, melainkan atribut tanggung jawab pada tiket
- komentar, lampiran, dan histori aktivitas dapat terjadi pada berbagai tahap status

### Pengembangan Lanjutan

Bagian ini belum diimplementasikan dan hanya termasuk roadmap:

- status seperti `pending`, `on_hold`, atau `closed`
- aturan SLA dan eskalasi otomatis

## 4. Visual RBAC

### Diagram peran singkat

```mermaid
flowchart TB
    reporter["Reporter<br/>Melapor dan memantau tiket sendiri"]
    agent["Agent<br/>Triage, assignment, update status"]
    admin["Admin<br/>Akses operasional penuh"]

    reporter -->|"Eskalasi operasional"| agent
    agent -->|"Koordinasi dan distribusi kerja"| admin
```

### Matriks hak akses

| Aktivitas | Reporter | Agent | Admin |
| --- | --- | --- | --- |
| Login ke aplikasi | Ya | Ya | Ya |
| Membuat tiket | Ya | Tidak | Ya |
| Melihat tiket sendiri | Ya | Ya | Ya |
| Melihat dashboard dan daftar tiket operasional | Tidak | Ya | Ya |
| Menambahkan komentar pada tiket yang dapat diakses | Ya | Ya | Ya |
| Mengubah status tiket | Tidak | Ya | Ya |
| Mengambil assignment untuk diri sendiri | Tidak | Ya | Ya |
| Menugaskan tiket ke operator lain yang eligible | Tidak | Ya | Ya |
| Melihat queue `Ditugaskan ke Saya` | Tidak | Ya | Ya |
| Memantau antrean operasional lintas tiket | Tidak | Ya | Ya |

Penjelasan praktis:

- `Reporter` fokus pada pencatatan masalah dan pemantauan tiket yang relevan dengan identitasnya.
- `Agent` fokus pada triage, assignment, penanganan, dan update status.
- `Admin` memiliki cakupan operasional paling luas dan juga dapat membuat tiket.

## 5. Diagram Secure File Upload

Diagram ini menjelaskan alur lampiran privat yang saat ini digunakan oleh OpsDesk.

```mermaid
sequenceDiagram
    participant U as Pengguna
    participant F as Frontend
    participant A as API Gateway
    participant L as Lambda Backend
    participant S as S3 Privat

    U->>F: Pilih file lampiran
    F->>A: POST /tickets/{id}/attachments/upload-url
    A->>L: Teruskan request
    L->>S: Buat presigned upload URL
    S-->>L: URL upload bertanda tangan
    L-->>A: Kembalikan object key + upload URL
    A-->>F: Response upload URL
    F->>S: Upload file langsung ke S3
    S-->>F: Upload berhasil
    F->>A: POST /tickets/{id}/attachments (metadata)
    A->>L: Simpan metadata lampiran
    L->>S: Verifikasi object ada
    L->>L: Tambahkan entri aktivitas attachment
    L-->>A: Metadata lampiran tersimpan
    A-->>F: Detail lampiran untuk tiket
```

Poin penting dari implementasi saat ini:

- file tidak diunggah langsung sebagai payload besar ke backend
- bucket S3 bersifat privat
- frontend hanya menerima URL sementara yang sudah ditandatangani
- metadata lampiran baru dicatat setelah backend menyimpan referensi lampiran pada tiket

## 6. Diagram Audit Trail / Aktivitas

Diagram ini menunjukkan bagaimana aksi utama pada tiket menjadi histori yang terlihat di detail tiket.

```mermaid
flowchart TD
    create["Tiket dibuat"]
    assign["Assignment diubah"]
    status["Status diubah"]
    comment["Komentar ditambahkan"]
    attachment["Lampiran ditambahkan"]
    backend["Backend menambahkan<br/>entri activity append-only"]
    ticket["Data tiket tersimpan<br/>dengan aktivitas terbaru"]
    detail["Halaman detail tiket<br/>menampilkan riwayat aktivitas"]

    create --> backend
    assign --> backend
    status --> backend
    comment --> backend
    attachment --> backend
    backend --> ticket
    ticket --> detail
```

### Jenis aktivitas yang sudah tercatat

Implementasi saat ini sudah mencatat aktivitas berikut:

- tiket dibuat
- assignment diubah
- status diubah
- komentar ditambahkan
- lampiran ditambahkan

Nilai operasionalnya:

- reviewer dapat melihat jejak penanganan tiket
- operator dapat memahami perubahan terakhir tanpa mencari konteks di luar sistem
- histori menjadi lebih rapi dibanding komunikasi yang tersebar di chat

## Panduan Baca Cepat

Jika pembaca hanya punya waktu singkat, urutan baca yang direkomendasikan adalah:

1. diagram arsitektur sistem
2. user flow
3. ticket lifecycle
4. RBAC
5. secure file upload
6. audit trail

## Referensi Terkait

- README utama: [../README.md](../README.md)
- Dokumen arsitektur teks: [./architecture.md](./architecture.md)
- Panduan penggunaan: [./usage-guide.md](./usage-guide.md)
- Panduan demo: [./demo-guide.md](./demo-guide.md)
