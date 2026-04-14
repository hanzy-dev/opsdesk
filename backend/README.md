# Backend

This package contains the Go foundation for the OpsDesk serverless backend.

Current scope:

- local HTTP bootstrap for development
- Lambda-oriented bootstrap placeholder
- shared config loading
- domain models and API DTOs
- request validation helpers
- thin HTTP handlers with service and repository layers
- DynamoDB-backed ticket creation, listing, detail lookup, status updates, and comments

This batch switches backend persistence from in-memory storage to DynamoDB while keeping the current HTTP API contract stable.
