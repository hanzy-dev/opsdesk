# Setup and Deployment Notes

## Overview

This document explains how to run OpsDesk locally, how to build and deploy the backend with AWS SAM, and how the frontend is expected to be deployed with Vercel.

The setup is intentionally lightweight and reviewer-friendly.

## Environment Variables

### Frontend

Location:

- `frontend/.env`

Variables:

- `VITE_API_BASE_URL`
  Example: `http://localhost:8080/v1`
  Purpose: base URL for the backend API used by the React frontend

### Backend

The backend reads configuration from environment variables.

Variables used by the current implementation:

- `APP_ENV`
  Example: `development`
- `API_BASE_PATH`
  Example: `/v1`
- `LOG_LEVEL`
  Example: `info`
- `TICKET_TABLE_NAME`
  Example: `opsdesk-dev-tickets`

Notes:

- For local backend development, `TICKET_TABLE_NAME` must point to a reachable DynamoDB table.
- In AWS deployment, `TICKET_TABLE_NAME` is wired by the SAM template.

### Infrastructure

The SAM template uses deploy-time parameters:

- `ProjectName`
- `StageName`
- `AppEnv`
- `ApiBasePath`
- `FrontendOrigin`
- `LogLevel`

These are shown in [infra/template.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/infra/template.yaml) and [infra/samconfig.example.toml](/d:/Semester%206/Cloud%20Computing/opsdesk/infra/samconfig.example.toml).
The ready-to-use default SAM config for this batch is [infra/samconfig.toml](/d:/Semester%206/Cloud%20Computing/opsdesk/infra/samconfig.toml).

## Local Backend Run

From `backend/`:

```bash
go test ./...
go run ./cmd/local
```

Example local backend URL:

```text
http://localhost:8080/v1
```

## Local Frontend Run

From `frontend/`:

```bash
npm install
npm run dev
```

Recommended local `.env`:

```text
VITE_API_BASE_URL=http://localhost:8080/v1
```

## AWS SAM Build and Deploy Flow

From `infra/`:

Validate:

```bash
sam validate --template-file template.yaml
```

Build:

```bash
sam build --template-file template.yaml
```

Deploy with guided setup:

```bash
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

After the first guided deploy, the saved SAM configuration can be reused for later deployments.
This batch packages the backend Lambda as a container image built from `backend/Dockerfile.lambda`, so Docker must be running locally before `sam build`.

Recommended parameter values for the current backend deployment:

```text
ProjectName=opsdesk
StageName=dev
AppEnv=development
ApiBasePath=/v1
FrontendOrigin=http://localhost:5173
LogLevel=info
```

Recommended later deploy flow:

```bash
sam build --template-file template.yaml
sam deploy --config-file samconfig.toml --resolve-image-repos
```

Useful commands after deployment:

```bash
aws cloudformation describe-stacks --stack-name opsdesk-dev --query "Stacks[0].Outputs" --output table
aws cloudformation describe-stacks --stack-name opsdesk-dev --query "Stacks[0].Outputs[?OutputKey=='SuggestedHealthEndpoint'].OutputValue" --output text
```

Example verification with the deployed API:

```bash
curl https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/dev/v1/health
curl https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/dev/v1/tickets
```

## GitHub Actions

Current workflows:

- `Backend CI`
  Runs backend tests and builds the Go binaries for local and Lambda entrypoints.
- `SAM Readiness`
  Validates the SAM template and runs `sam build` to confirm deployment readiness.

These workflows are intentionally simple and suitable for a university reviewer.

## Frontend Deployment Expectation on Vercel

The frontend is prepared for GitHub-connected deployment on Vercel.

Recommended Vercel settings:

- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Required frontend environment variable on Vercel:

- `VITE_API_BASE_URL`

This should point to the deployed backend API Gateway base path, for example:

```text
https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/dev/v1
```

## Quick Lecturer Review Path

Recommended quick review flow:

1. Check [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md) and [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml).
2. Check `.github/workflows/` to see the CI and SAM readiness setup.
3. Check `frontend/` and `backend/` to inspect the implementation.
4. If needed, run the frontend locally against the local or deployed backend.
