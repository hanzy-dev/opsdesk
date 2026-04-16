# OpsDesk Architecture

## Overview

OpsDesk adalah aplikasi helpdesk internal kecil dengan arsitektur serverless AWS yang sengaja dijaga tetap sederhana. Fokusnya adalah alur tiket operasional yang rapi, bisa dideploy, mudah diverifikasi, dan cukup production-oriented tanpa masuk ke kompleksitas enterprise.

## Monorepo Layout

- `frontend/`: React + Vite + TypeScript web client for end users
- `backend/`: Go-based Lambda handlers, services, repositories, and validation logic
- `infra/`: Infrastructure-as-code for AWS resources and deployment configuration
- `docs/`: Project documentation, architecture notes, and delivery roadmap

## Current Architecture

### Frontend

- React + Vite + TypeScript
- deployed di Vercel
- User-facing text will be written in Bahasa Indonesia
- Timestamps will be displayed in Asia/Jakarta time

### Backend

- Go application yang berjalan sebagai Lambda container image
- API dipublikasikan melalui API Gateway HTTP API
- handler tetap tipis dan mendorong logika ke service layer
- validasi request dilakukan sebelum proses bisnis
- error response konsisten dan membawa `requestId`

### Data Layer

- DynamoDB sebagai primary data store tiket
- satu record tiket menyimpan komentar, aktivitas, dan metadata lampiran
- S3 private bucket untuk file lampiran
- presigned PUT dipakai untuk upload dan presigned GET untuk open/download
### Identity and Access

- Amazon Cognito User Pool untuk autentikasi
- group RBAC:
  - `reporter`
  - `agent`
  - `admin`
- assignment tiket saat ini hanya ke operator yang sedang login

### Observability

- structured JSON logs di backend
- request ID per request
- API Gateway access log ke CloudWatch
- Lambda application logs ke CloudWatch

## High-Level Request Flow

1. Pengguna membuka frontend production di Vercel.
2. Frontend mengirim request ke API Gateway HTTP API pada base URL final.
3. API Gateway memanggil Lambda backend.
4. Adapter Lambda mengubah event API Gateway menjadi request HTTP internal.
5. Middleware backend menambahkan request ID, structured logging, dan error handling operasional.
6. Router melakukan autentikasi JWT Cognito dan RBAC.
7. Service menjalankan logika tiket, activity, assignment, komentar, dan attachment.
8. Repository membaca atau menulis DynamoDB, dan storage layer menangani S3 presigned URL.
9. Response JSON dikembalikan ke frontend dengan format sukses atau error yang konsisten.

## Design Principles

- incremental dan maintainable
- RESTful API yang kecil dan stabil
- AWS-native bila sudah cukup
- production-oriented untuk aplikasi internal kecil
- menghindari microservices, queue, WAF, atau kompleksitas enterprise yang belum dibutuhkan

## Known Limitations

- belum ada malware scanning attachment
- belum ada distributed tracing atau alerting lanjutan
- belum ada assignment ke operator lain
- belum ada email notification atau automation workflow
- belum ada multi-tenant support
