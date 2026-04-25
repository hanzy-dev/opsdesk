# Infrastruktur AWS SAM

Folder ini berisi konfigurasi AWS SAM untuk deployment backend OpsDesk. Stack dibuat ringan dan praktis untuk proyek portfolio cloud: cukup aman untuk demonstrasi production-oriented, tetapi tetap menjaga biaya dan kompleksitas agar masuk akal untuk akun AWS student.

## Cakupan Stack

Resource utama yang dibuat:

- satu AWS Lambda function berbasis Go dan container image
- satu API Gateway HTTP API
- satu tabel DynamoDB untuk tiket
- satu tabel DynamoDB untuk profil user
- satu bucket S3 privat untuk lampiran
- satu Cognito User Pool dan public app client
- tiga Cognito group untuk RBAC: `reporter`, `agent`, dan `admin`
- CloudWatch Log Group untuk Lambda dan API Gateway dengan retention 7 hari

Stack ini tidak menambahkan WAF, custom domain, VPC, CloudFront, alarm lanjutan, atau layanan berbiaya tinggi lain.

## Keputusan Desain

- **AWS SAM** dipakai agar infrastructure as code tetap mudah dibaca dan dideploy.
- **Lambda container image** dibangun dari [backend/Dockerfile.lambda](../backend/Dockerfile.lambda).
- **API Gateway HTTP API** dipilih karena lebih sederhana dan hemat biaya dibanding REST API untuk kebutuhan OpsDesk saat ini.
- **DynamoDB PAY_PER_REQUEST** dipakai agar biaya mengikuti pemakaian tanpa perlu provisioning kapasitas manual.
- **Point-in-Time Recovery DynamoDB** aktif secara default melalui parameter `EnableDynamoPointInTimeRecovery=true` untuk perlindungan data dasar. Jika biaya perlu ditekan saat eksperimen, parameter ini bisa diubah menjadi `false`.
- **S3 bucket lampiran** tetap privat, memblokir public access, memakai bucket owner enforced, dan mengenkripsi object dengan SSE-S3.
- **S3 lifecycle** hanya membersihkan incomplete multipart upload setelah 1 hari. Aturan ini tidak menghapus lampiran yang sudah berhasil disimpan.
- **CORS** API Gateway dan S3 dibatasi ke `FrontendOrigin`, yaitu domain frontend Vercel production.
- **Log retention** diset 7 hari agar log tetap tersedia untuk debugging dasar tanpa menumpuk biaya penyimpanan.

## Parameter

Parameter utama:

- `ProjectName`
- `StageName`
- `AppEnv`
- `ApiBasePath`
- `FrontendOrigin`
- `LogLevel`
- `EnableDynamoPointInTimeRecovery`

Baseline deployment repository ini:

```text
ProjectName=opsdesk
StageName=dev
AppEnv=dev
ApiBasePath=/v1
FrontendOrigin=https://opsdesk-teal.vercel.app
LogLevel=info
EnableDynamoPointInTimeRecovery=true
```

Environment variable backend yang diisi oleh SAM:

- `APP_ENV`
- `API_BASE_PATH`
- `FRONTEND_ORIGIN`
- `LOG_LEVEL`
- `TICKET_TABLE_NAME`
- `PROFILE_TABLE_NAME`
- `ATTACHMENT_BUCKET_NAME`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_APP_CLIENT_ID`

Nilai tersebut tidak berisi secret. Cognito client dibuat sebagai public app client tanpa client secret karena dipakai oleh frontend browser.

## Build dan Deploy

Dari folder `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --config-file samconfig.toml --resolve-image-repos
```

Deploy pertama bisa menggunakan mode guided:

```bash
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

`sam build` membutuhkan Docker karena backend dikemas sebagai Lambda container image.

## Output Penting

CloudFormation output yang berguna untuk verifikasi dan konfigurasi frontend:

- `HttpApiUrl`
- `ApiBaseUrl`
- `SuggestedHealthEndpoint`
- `BackendFunctionName`
- `TicketsTableName`
- `ProfilesTableName`
- `AttachmentsBucketName`
- `CognitoUserPoolId`
- `CognitoUserPoolClientId`
- `CognitoIssuerUrl`

`ApiBaseUrl` dipakai sebagai nilai `VITE_API_BASE_URL` di Vercel.

## Catatan Keamanan dan Biaya

- Bucket lampiran tidak publik; upload dan download tetap melalui presigned URL.
- DynamoDB memakai billing on-demand agar tidak perlu kapasitas idle.
- PITR memberi opsi pemulihan data, tetapi tetap memiliki biaya. Untuk lingkungan sementara yang sangat hemat biaya, gunakan `EnableDynamoPointInTimeRecovery=false`.
- IAM policy Lambda masih memakai SAM managed policy yang terikat pada nama tabel dan bucket. Ini cukup praktis untuk baseline portfolio, tetapi belum granular seperti setup enterprise penuh.
- Stack ini sengaja tidak memakai WAF, VPC, custom domain, CloudFront, malware scanning lampiran, atau alerting otomatis.

## Verifikasi Setelah Deploy

Gunakan checklist rilis di [docs/release-checklist.md](../docs/release-checklist.md), terutama:

- `sam validate`
- `sam build`
- `sam deploy`
- `GET /v1/health`
- endpoint protected tanpa token mengembalikan `401`
- flow login Cognito, tiket, PATCH update, dan presigned URL S3 berjalan
