# OpsDesk Roadmap

## Batch 1 - Project Foundation

- Finalize the MVP scope
- Define explicit non-goals
- Prepare the monorepo folder structure
- Add initial repository documentation
- Add shared repository housekeeping files

## Batch 2 - Backend Foundation

- Initialize the Go backend module
- Define a clean internal package structure
- Add a minimal Lambda entrypoint layout
- Add shared configuration loading
- Add request and domain models for tickets
- Establish validation and timestamp conventions

## Batch 3 - Infrastructure Foundation

- Choose the IaC approach for AWS resources
- Define DynamoDB, Lambda, API Gateway, and CloudWatch resources
- Prepare deployable dev infrastructure configuration
- Document deployment assumptions and cost-conscious defaults

## Batch 4 - Ticket Create and List API

- Implement ticket creation
- Implement ticket listing
- Add request validation
- Add repository logic for DynamoDB persistence
- Add basic backend tests for core logic

## Batch 5 - Ticket Detail and Status Update API

- Implement ticket detail retrieval
- Implement ticket status update
- Keep handlers thin and business logic modular
- Improve error handling and API response consistency

## Batch 6 - Frontend Foundation

- Initialize the React + Vite + TypeScript frontend
- Set up the base application structure
- Add routing and a simple layout
- Establish shared API client patterns
- Keep all UI text in Bahasa Indonesia

## Batch 7 - Frontend Ticket Flows

- Build ticket list and detail views
- Build ticket creation and status update forms
- Display timestamps in Asia/Jakarta time
- Connect the frontend to the deployed API

## Batch 8 - CI/CD and Documentation Polish

- Add focused GitHub Actions workflows
- Add lint or test automation where valuable
- Refine architecture and deployment docs
- Prepare portfolio-friendly project presentation

## Batch 9 - Final Hardening

- Review MVP completeness against scope
- Trim unnecessary complexity
- Verify deployment flow end to end
- Write the final Bahasa Indonesia README after implementation stabilizes
