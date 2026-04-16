# API Documentation

## Overview

OpsDesk exposes a small HTTP API for a serverless helpdesk workflow. The current implementation supports:

- health checks
- authenticated identity lookup
- ticket creation
- ticket listing
- ticket detail lookup
- ticket ownership and assignee metadata
- ticket assignment
- ticket activity history
- secure ticket attachments
- ticket status updates
- ticket comments

The authoritative machine-readable contract is in [openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml).

## How To Read The OpenAPI File

The OpenAPI file is written in OpenAPI 3.0.3 YAML format.

Key sections:

- `paths`: available endpoints and methods
- `components/schemas`: request and response models
- `servers`: example local and deployed base URLs
- `components/parameters`: reusable path parameters such as ticket ID

The spec follows the current backend implementation instead of proposing a redesigned API.

## Example Base URLs

Final deployed frontend:

```text
https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app
```

Final deployed API Gateway base URL:

```text
https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
```

## Quick Lecturer Review Guide

Fast inspection path:

1. Open [openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml).
2. Review the `paths` section for the supported endpoints.
3. Check `TicketStatus` to see the allowed status values:
   `open`, `in_progress`, `resolved`
4. Check `ErrorResponse` to understand the JSON error shape used by the backend.

## Quick Testing Suggestions

Recommended quick checks:

1. `GET /health`
   This confirms the backend is reachable.
2. `GET /auth/me`
   This confirms the JWT token is accepted by the backend.
3. `POST /tickets`
   Create one ticket with a small JSON payload.
4. `GET /tickets`
   Confirm the created ticket appears in the list and test `q`, `status`, `priority`, `assignee`, `page`, `page_size`, `sort_by`, and `sort_order`.
5. `PATCH /tickets/{id}/status`
   Change the status to `in_progress` or `resolved`.
6. `PATCH /tickets/{id}/assignment`
   Assign the ticket to the authenticated operator.
7. `POST /tickets/{id}/comments`
   Add one comment and verify the detail response includes it.
8. `GET /tickets/{id}/activities`
   Confirm the activity timeline contains create/update/comment/assignment/attachment events.
9. `POST /tickets/{id}/attachments/upload-url` then `POST /tickets/{id}/attachments`
   Confirm the upload URL is returned, upload succeeds to S3, and attachment metadata appears in ticket detail.
10. `GET /tickets/{id}/attachments/{attachmentId}/download`
   Confirm a short-lived download/open URL is returned for an accessible ticket.

## Notes

- Timestamps are documented as UTC RFC3339 / ISO 8601 strings.
- All endpoints except `GET /health` require a valid Cognito JWT bearer token.
- Backend reads RBAC from Cognito groups `reporter`, `agent`, and `admin`.
- Forbidden actions return `403` even if the frontend hides the action.
- Assignment policy in this batch is intentionally simple: `agent` and `admin` may assign or reassign a ticket to themselves.
- Activity history is append-only and stored with the current ticket record for simplicity.
- Attachments use a private S3 bucket with presigned PUT for upload and presigned GET for open/download.
- Attachment metadata is stored inside the existing ticket record.
- Attachment upload validation currently allows PDF, JPG, PNG, TXT, CSV, and DOCX up to 10 MB.
- Ticket explorer uses server-side query handling for search, filter, sorting, and pagination.
- `GET /tickets` supports `assignee=me` and `assignee=unassigned`.
- `GET /tickets` still accepts `assignedToMe=true` as a lightweight backward-compatible alias.
- Paginated ticket responses now return:
  - `data.items`
  - `data.pagination.page`
  - `data.pagination.page_size`
  - `data.pagination.total_items`
  - `data.pagination.total_pages`
  - `data.pagination.has_next`
- The deployment baseline uses the `dev` backend environment.
