# OpsDesk

OpsDesk is a serverless helpdesk and incident ticketing monorepo prepared for a cloud computing course project and a portfolio-ready GitHub showcase.

This repository is being built incrementally. The current codebase already includes:

- a Go backend for AWS Lambda + API Gateway HTTP API
- DynamoDB-backed ticket persistence
- a React + Vite + TypeScript frontend
- OpenAPI documentation for the current API
- lightweight GitHub Actions workflows for backend and SAM readiness checks

## Repository Structure

- `frontend/`: React + Vite + TypeScript client application
- `backend/`: Go backend application and Lambda entrypoints
- `infra/`: AWS SAM template and deployment support files
- `docs/`: architecture notes, roadmap, API documentation, and setup guidance

## Quick Review

Recommended fast review path:

1. Read [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md) and [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml) for the API contract.
2. Read [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md) for local run and deployment flow.
3. Inspect `.github/workflows/` for the current CI and deployment-readiness checks.
4. Review [docs/architecture.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/architecture.md) for the project structure.

## Current Documentation

- [docs/api.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/api.md)
- [docs/openapi.yaml](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/openapi.yaml)
- [docs/setup.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/setup.md)
- [docs/architecture.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/architecture.md)
- [docs/roadmap.md](/d:/Semester%206/Cloud%20Computing/opsdesk/docs/roadmap.md)
