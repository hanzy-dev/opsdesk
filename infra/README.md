# Infrastructure

This directory contains the AWS SAM foundation for the OpsDesk backend deployment.

## Scope

Current infrastructure scope is intentionally small:

- one Go-based AWS Lambda function
- one API Gateway HTTP API
- one DynamoDB table for ticket persistence
- CloudWatch-friendly log retention defaults
- basic environment variable wiring for the backend

## Design Choices

- **AWS SAM** is used to keep the infrastructure approachable for a university assignment.
- **Lambda runtime** uses `provided.al2023` to support a Go custom runtime path.
- **API Gateway HTTP API** is used instead of REST API to keep cost and complexity lower.
- **ARM64** is the default Lambda architecture to stay cost-conscious.
- **CloudWatch log retention** is limited to 7 days to avoid unnecessary log storage growth.

## Deployment Boundary

This batch includes the minimum persistence infrastructure needed for the current backend workflow. It still does not include:

- Cognito or any authentication layer
- S3, file storage, or attachments
- custom domains
- alarms, WAF, VPC networking, or advanced production hardening

## Build Assumption

The SAM template builds the Lambda binary from `../backend/cmd/lambda` using the local Go toolchain through the Makefile in this directory.

## Parameters

Key deploy-time parameters:

- `ProjectName`
- `StageName`
- `AppEnv`
- `ApiBasePath`
- `FrontendOrigin`
- `LogLevel`

Backend runtime environment variables wired by SAM:

- `APP_ENV`
- `API_BASE_PATH`
- `LOG_LEVEL`
- `PORT`
- `TICKET_TABLE_NAME`

## Example Commands

Validate:

```bash
sam validate --template-file infra/template.yaml
```

Build:

```bash
sam build --template-file infra/template.yaml
```

Deploy with guided prompts:

```bash
sam deploy --guided --template-file infra/template.yaml
```

## Deferred Work

Later batches should add:

- deployment environments beyond the dev baseline
- CI/CD workflow integration
