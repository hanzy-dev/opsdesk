# Backend

This directory contains the Go backend for OpsDesk.

Current scope:

- local HTTP bootstrap for development and verification
- Lambda bootstrap through the shared HTTP router
- Cognito JWT verification and RBAC helpers
- shared config loading
- domain models and API DTOs
- request validation helpers
- thin HTTP handlers with service and repository layers
- DynamoDB-backed ticket persistence
- private S3 attachment support
- structured logging and request ID propagation

The current baseline keeps the HTTP API contract small and stable for the deployed `dev` environment.
