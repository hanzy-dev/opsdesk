# Backend

This package contains the Go foundation for the OpsDesk serverless backend.

Current scope:

- local HTTP bootstrap for development
- Lambda-oriented bootstrap placeholder
- shared config loading
- domain models and API DTOs
- request validation helpers
- thin HTTP handlers with service and repository layers
- in-memory ticket creation, listing, detail lookup, status updates, and comments

Real persistence, AWS integration, and business workflow implementation will be added in later batches.
