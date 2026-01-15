# Terraform Infrastructure

## Structure

```
terraform/
├── environments/
│   └── dev/           # Environment config (main.tf, variables.tf, outputs.tf)
└── modules/
    ├── ecr/           # Container registry
    ├── dynamodb/      # Books table
    ├── lambda/        # Quarkus native function
    ├── api-gateway/   # HTTP API v2
    └── frontend/      # S3 + CloudFront
```

## AWS Resources

- **ECR**: Stores Quarkus native Lambda images
- **DynamoDB**: `litrpg-books-dev` table with `id` partition key
- **Lambda**: Quarkus native container
- **API Gateway**: HTTP API v2 proxying to Lambda
- **S3 + CloudFront**: React UI hosting
  - `/api/*` routes to API Gateway
  - Everything else to S3
  - SPA routing (404s → index.html)

## Commands

```bash
cd terraform/environments/dev
eval $(aws configure export-credentials --format env)
terraform init
terraform plan
terraform apply
terraform destroy  # Use with caution
```

## Deployment Flow

1. Build native container: `make build-lambda`
2. Push to ECR: handled by deploy scripts
3. Deploy infra: `make deploy-infra`
4. Deploy UI: `make deploy-ui`

Or all at once: `make deploy`
