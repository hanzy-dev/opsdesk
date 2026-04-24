# API Documentation

## Overview

OpsDesk mengekspos HTTP API kecil yang mengikuti implementasi backend saat ini. API ini mencakup:

- health check
- lookup identitas login
- feed notifikasi pengguna saat ini
- lookup dan update profil akun saat ini
- create/list/detail tiket
- update status tiket
- assignment tiket ke operator yang eligible
- komentar tiket
- timeline aktivitas tiket
- presigned upload URL dan presigned download URL untuk lampiran
- structured error response dengan `requestId`

The authoritative machine-readable contract is in [openapi.yaml](./openapi.yaml).
Viewer interaktif yang memakai source of truth yang sama tersedia di `https://opsdesk-teal.vercel.app/api-docs`.
Keduanya mendokumentasikan kontrak live untuk backend AWS yang sedang dideploy, bukan mock API atau endpoint rencana.

## How To Read The OpenAPI File

The OpenAPI file is written in OpenAPI 3.0.3 YAML format.

Bagian penting:

- `paths`: available endpoints and methods
- `components/schemas`: request and response models
- `servers`: base URL deployed yang dipakai repository ini
- `components/parameters`: reusable path parameters such as ticket ID

The spec follows the current backend implementation instead of proposing a redesigned API.

## Example Base URLs

Final deployed frontend:

```text
https://opsdesk-teal.vercel.app
```

Final deployed API Gateway base URL:

```text
https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
```

## Ringkasan Kontrak

- Semua endpoint selain `GET /health` membutuhkan bearer token JWT Cognito.
- Swagger UI memakai skema bearer Cognito yang sama dengan frontend production: tempel `Bearer <JWT>` dari sesi login Cognito untuk mencoba endpoint protected.
- RBAC dibaca dari group Cognito `reporter`, `agent`, dan `admin`.
- Semua timestamp memakai UTC RFC3339 / ISO 8601.
- Error backend memakai bentuk:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "request validation failed",
    "requestId": "req-abc123",
    "details": []
  }
}
```

## Quick Review Guide

Fast inspection path:

1. Open [openapi.yaml](./openapi.yaml).
2. Atau buka viewer Swagger UI di `https://opsdesk-teal.vercel.app/api-docs`.
3. Review the `paths` section for the supported endpoints.
4. Check `TicketStatus` to see the allowed status values:
   `open`, `in_progress`, `resolved`
5. Check `ErrorResponse` untuk bentuk JSON error, termasuk `requestId`.

## Quick Testing Suggestions

Recommended quick checks:

1. `GET /health`
   This confirms the backend is reachable.
2. `GET /auth/me`
   This confirms the JWT token is accepted by the backend.
3. `GET /notifications?limit=10`
   This confirms the authenticated user can read the notification feed generated from ticket activity.
4. `GET /profile/me` and `PATCH /profile/me`
   This confirms account profile data can be read and updated.
5. `POST /tickets`
   Create one ticket with a small JSON payload.
6. `GET /tickets`
   Confirm the created ticket appears in the list and test `q`, `status`, `priority`, `category`, `team`, `assignee`, `page`, `page_size`, `sort_by`, and `sort_order`.
7. `PATCH /tickets/{id}/status`
   Change the status to `in_progress` or `resolved`.
8. `PATCH /tickets/{id}/assignment`
   Assign the ticket to the authenticated operator or send `assigneeId` to move it to another eligible operator.
9. `POST /tickets/{id}/comments`
   Add one comment and verify the detail response includes it. Optional `visibility` accepts `public` or `internal`.
10. `GET /tickets/{id}/activities`
   Confirm the activity timeline contains create/update/comment/assignment/attachment events.
11. `POST /tickets/{id}/attachments/upload-url` then `POST /tickets/{id}/attachments`
   Confirm the upload URL is returned, upload succeeds to S3, and attachment metadata appears in ticket detail.
12. `GET /tickets/{id}/attachments/{attachmentId}/download`
   Confirm a short-lived download/open URL is returned for an accessible ticket.

## Notes

- Forbidden action tetap mengembalikan `403` walaupun aksi disembunyikan di frontend.
- `PATCH /tickets/{id}/assignment` menerima body kosong untuk self-assign, atau `assigneeId` untuk memindahkan tiket ke operator `agent`/`admin` lain yang eligible.
- Aktivitas tiket disimpan append-only di record tiket yang sama.
- Lampiran memakai bucket S3 private dengan presigned PUT dan presigned GET.
- Validasi lampiran saat ini mengizinkan PDF, JPG, PNG, TXT, CSV, dan DOCX sampai 10 MB.
- Profil akun mendukung perubahan `displayName` dan `avatarUrl` sederhana tanpa mengubah identitas dasar Cognito.
- `GET /tickets` mendukung `assignee=me`, `assignee=unassigned`, dan alias backward-compatible `assignedToMe=true`.
- `POST /tickets` saat ini benar-benar memerlukan `title`, `description`, `priority`, `category`, `team`, `reporterName`, dan `reporterEmail` sesuai validator backend.
- Baseline deploy yang dipakai repository ini tetap environment `dev`.
