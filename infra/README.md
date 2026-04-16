# Infrastructure

This directory contains the AWS SAM configuration for the OpsDesk backend deployment.

## Scope

Current infrastructure scope is intentionally small:

- one Go-based AWS Lambda function packaged as a container image
- one API Gateway HTTP API
- one DynamoDB table for ticket persistence
- one private S3 bucket for ticket attachments
- one Cognito User Pool and app client for authentication
- three Cognito groups for RBAC: `reporter`, `agent`, and `admin`
- CloudWatch-friendly log retention defaults
- basic environment variable wiring for the backend

## Design Choices

- **AWS SAM** is used to keep the infrastructure approachable and incremental.
- **Lambda packaging** uses a Lambda-compatible container image built by SAM from `backend/Dockerfile.lambda`.
- **API Gateway HTTP API** is used instead of REST API to keep cost and complexity lower.
- **x86_64** is the current Lambda architecture configured in the template.
- **CloudWatch log retention** is limited to 7 days to avoid unnecessary log storage growth.

## Deployment Boundary

The infrastructure stays intentionally small. It still does not include:

- custom domains
- alarms, WAF, VPC networking, or advanced production hardening

## Build Assumption

The SAM template builds the backend Lambda image from [backend/Dockerfile.lambda](/d:/Semester%206/Cloud%20Computing/opsdesk/backend/Dockerfile.lambda). The Dockerfile compiles `backend/cmd/lambda` into a `bootstrap` binary and places it into the AWS Lambda `provided.al2023` base image for `x86_64`.

## Parameters

Key deploy-time parameters:

- `ProjectName`
- `StageName`
- `AppEnv`
- `ApiBasePath`
- `FrontendOrigin`
- `LogLevel`

Current defaults in this repository:

- `StageName=dev`
- `AppEnv=dev`
- `FrontendOrigin=https://opsdesk-cs747lhoe-hanzy-devs-projects.vercel.app`
- API base URL output expected after deploy: `https://ezkjgr2we9.execute-api.ap-southeast-1.amazonaws.com/dev/v1`

Backend runtime environment variables wired by SAM:

- `APP_ENV`
- `API_BASE_PATH`
- `LOG_LEVEL`
- `TICKET_TABLE_NAME`
- `ATTACHMENT_BUCKET_NAME`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_APP_CLIENT_ID`

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
sam deploy --guided --resolve-image-repos --template-file infra/template.yaml
```

Recommended first deploy from `infra/`:

```bash
sam build --template-file template.yaml
sam deploy --guided --resolve-image-repos --config-file samconfig.toml --template-file template.yaml
```

Recommended later deploys from `infra/` after `samconfig.toml` exists:

```bash
sam build --template-file template.yaml
sam deploy --config-file samconfig.toml --resolve-image-repos
```

Useful stack outputs after deployment:

- `HttpApiUrl`
- `ApiBaseUrl`
- `SuggestedHealthEndpoint`
- `TicketsTableName`
- `AttachmentsBucketName`
- `BackendFunctionName`
- `CognitoUserPoolId`
- `CognitoUserPoolClientId`

## Current Hardening Notes

- API Gateway CORS is intentionally locked to the final frontend domain.
- Lambda and API Gateway logs both use 7-day retention.
- The stack keeps a small AWS-native footprint to stay maintainable for this project.
