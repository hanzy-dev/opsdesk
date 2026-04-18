# OpsDesk

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TypeScript-3178C6)
![Backend](https://img.shields.io/badge/Backend-Go-00ADD8)
![AWS Stack](https://img.shields.io/badge/AWS-Lambda%20%7C%20API%20Gateway%20%7C%20DynamoDB%20%7C%20Cognito%20%7C%20S3-FF9900)
![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%2B%20AWS%20SAM-111111)
![Status](https://img.shields.io/badge/Status-Active%20Development-0A7F5A)

OpsDesk is a cloud-based helpdesk and ticketing application for internal operational support. This repository contains the production-oriented implementation of the web frontend, Go backend, AWS infrastructure, and supporting documentation used by the deployed system.

## Overview

OpsDesk is built as a focused helpdesk platform with authenticated access, role-based permissions, ticket lifecycle management, secure attachments, and deployment guidance aligned with the current system state.

Fixed deployment constants for this repository:

- Frontend domain: `https://opsdesk-teal.vercel.app`
- Backend environment: `dev`
- API base URL: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`
- Cognito region: `ap-southeast-1`
- Cognito user pool ID: `ap-southeast-1_sMFqei7IT`
- Cognito client ID: `3gtbp1t96krpj6t9hfon4ljujn`

## Key Features

- Amazon Cognito authentication with real login flow
- Role-based access control for `reporter`, `agent`, and `admin`
- Ticket creation, listing, detail view, comments, and status updates
- Ticket ownership for self-service access control
- Self-assignment workflow for `agent` and `admin`
- Append-only activity log on ticket detail
- Server-side search, filtering, sorting, and pagination
- Private S3 attachments with presigned upload and download flows
- Structured logging and request ID propagation for operational troubleshooting
- OpenAPI documentation aligned with the implemented backend
- Backend and frontend test coverage for key flows

## Architecture

Primary components:

- `frontend/`: React, Vite, and TypeScript application deployed on Vercel
- `backend/`: Go HTTP application packaged for local execution and AWS Lambda container deployment
- `infra/`: AWS SAM templates and deployment configuration
- `docs/`: operational, API, setup, and architecture documentation

Runtime architecture:

1. Users access the frontend at `https://opsdesk-teal.vercel.app`.
2. The frontend calls the HTTP API at `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`.
3. API Gateway forwards requests to the Go backend running on AWS Lambda as a container image.
4. The backend validates Cognito JWTs, applies RBAC, and executes ticket workflows.
5. Ticket data is stored in DynamoDB and attachment objects are stored in a private S3 bucket.
6. Structured logs and request IDs support troubleshooting in CloudWatch.

## Deployment

### Frontend

- Platform: Vercel
- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Production domain: `https://opsdesk-teal.vercel.app`

### Backend and Infrastructure

- Platform: AWS
- Infrastructure as Code: AWS SAM
- Runtime model: Go backend deployed to AWS Lambda as a container image
- API layer: API Gateway HTTP API
- Data and identity services: DynamoDB, Amazon Cognito, Amazon S3
- Deployed backend environment: `dev`

Typical infrastructure workflow from `infra/`:

```bash
sam validate --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

Subsequent deployments:

```bash
sam build --template-file template.yaml
sam deploy --config-file samconfig.toml --resolve-image-repos
```

## Environment Variables

### Frontend

Create `frontend/.env` based on [frontend/.env.example](/d:/Semester%206/Cloud%20Computing/opsdesk/frontend/.env.example):

```text
VITE_API_BASE_URL=https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
VITE_COGNITO_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

Frontend environment variables are required explicitly. The application does not rely on silent fallbacks for API or Cognito configuration.

### Backend

The backend reads these runtime variables:

- `APP_ENV`
- `API_BASE_PATH`
- `LOG_LEVEL`
- `TICKET_TABLE_NAME`
- `ATTACHMENT_BUCKET_NAME`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_APP_CLIENT_ID`

For the deployed stack, the standardized values are:

```text
APP_ENV=dev
API_BASE_PATH=/v1
LOG_LEVEL=info
COGNITO_REGION=ap-southeast-1
COGNITO_USER_POOL_ID=ap-southeast-1_sMFqei7IT
COGNITO_APP_CLIENT_ID=3gtbp1t96krpj6t9hfon4ljujn
```

`TICKET_TABLE_NAME` and `ATTACHMENT_BUCKET_NAME` are provided by the deployed SAM stack.

## Authentication and Roles

Authentication is implemented with Amazon Cognito. The frontend authenticates users against the configured user pool and sends bearer tokens to the backend. The backend validates JWTs and derives authorization from Cognito group membership.

Supported roles:

- `reporter`: create tickets, view owned tickets, and comment on owned tickets
- `agent`: view operational tickets, update status, comment, and assign tickets to the authenticated agent
- `admin`: full operational access, including self-assignment

Current assignment policy is intentionally limited:

- there is no operator directory in this batch
- assignment to other users is not implemented
- the assignment endpoint applies the currently authenticated operator

## API Documentation

The machine-readable API contract is available at [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml). Supporting references:

- [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md)
- [docs/architecture.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/architecture.md)
- [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md)
- [docs/usage-guide.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/usage-guide.md)
- [docs/operations.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/operations.md)

Implemented HTTP endpoints include:

- `GET /v1/health`
- `GET /v1/auth/me`
- `POST /v1/tickets`
- `GET /v1/tickets`
- `GET /v1/tickets/{id}`
- `PATCH /v1/tickets/{id}/status`
- `PATCH /v1/tickets/{id}/assignment`
- `GET /v1/tickets/{id}/activities`
- `POST /v1/tickets/{id}/comments`
- `POST /v1/tickets/{id}/attachments/upload-url`
- `POST /v1/tickets/{id}/attachments`
- `GET /v1/tickets/{id}/attachments/{attachmentId}/download`

## Known Limitations

- Assignment is limited to the authenticated operator; assignment to another user is not available.
- Advanced malware scanning or post-upload attachment processing is not implemented.
- Advanced observability such as distributed tracing and automated alerting is not included.
- Enterprise workflow features such as SLA automation and notification pipelines are outside the current scope.
- Infrastructure remains intentionally compact and does not include custom domains, WAF, or broader production hardening.

## License

This project is licensed under the MIT License. See [LICENSE](/d:/Semester%206/Cloud%20Computing/opsdesk/LICENSE) for details.
