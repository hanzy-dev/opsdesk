# OpsDesk Architecture

## Overview

OpsDesk is a small serverless helpdesk and incident ticketing application. The system is kept intentionally focused so it remains maintainable, reviewable, and suitable for an internal operational workflow.

## Monorepo Layout

- `frontend/`: React + Vite + TypeScript web client for end users
- `backend/`: Go-based Lambda handlers, services, repositories, and validation logic
- `infra/`: Infrastructure-as-code for AWS resources and deployment configuration
- `docs/`: Project documentation, architecture notes, and delivery roadmap

## MVP Scope

The MVP should support a focused helpdesk workflow:

- Create a ticket
- View a ticket list
- View ticket details
- Update ticket status
- Add internal progress notes if they remain simple text entries
- Show basic operational status through CloudWatch-backed logs and metrics

## Non-Goals

The following items are explicitly out of scope for the MVP:

- File attachments
- Authentication with Cognito
- Email notifications
- Realtime updates
- Analytics dashboards
- Role-based access control beyond simple application assumptions
- Advanced SLA engines, automation rules, or escalation workflows
- Multi-tenant support
- Full-text search
- Offline support

## Planned Architecture

### Frontend

- React + Vite + TypeScript
- Deployed on Vercel
- User-facing text will be written in Bahasa Indonesia
- Timestamps will be displayed in Asia/Jakarta time

### Backend

- Go application deployed to AWS Lambda
- API exposed through API Gateway HTTP API
- Thin handlers delegating to application services
- Request validation before business processing or persistence
- Timestamps stored and returned in UTC using RFC3339 / ISO 8601

### Data Layer

- DynamoDB as the primary data store
- Single-table or simple-table design should stay pragmatic and assignment-friendly
- Data model should prioritize tickets first, with note history only if needed for the MVP

### Monitoring

- CloudWatch Logs for Lambda and API visibility
- Basic metrics and error visibility sufficient for the current operational baseline

### Delivery

- GitHub Actions for focused CI checks where useful
- Incremental batches to keep each push reviewable

## High-Level Request Flow

1. A user interacts with the React frontend on Vercel.
2. The frontend sends HTTP requests to API Gateway.
3. API Gateway invokes Go-based AWS Lambda handlers.
4. Lambda services validate input and execute business logic.
5. Repositories persist and fetch ticket data from DynamoDB.
6. Logs and operational signals flow to CloudWatch.

## Design Principles

- Keep the MVP small and clear
- Prefer modular structure over premature abstraction
- Stay free-tier-conscious
- Keep documentation easy to extend in later batches
