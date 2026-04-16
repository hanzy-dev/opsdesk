# Backend

This package contains the Go foundation for the OpsDesk serverless backend.

Current scope:

- local HTTP bootstrap for development and verification
- Lambda bootstrap wired through the existing Go HTTP router
- shared config loading
- domain models and API DTOs
- request validation helpers
- thin HTTP handlers with service and repository layers
- DynamoDB-backed ticket creation, listing, detail lookup, status updates, and comments

The current baseline keeps the HTTP API contract small and stable while using DynamoDB-backed ticket workflows for the deployed `dev` environment.
