# AWS Rules

## SSO Credential Export

The Java SDK doesn't support AWS SSO `login_session` directly. Export credentials before running commands:

```bash
eval "$(aws configure export-credentials --format env)" && AWS_REGION=us-west-2 <command>
```

## Production Curator Commands

```bash
# Add book to production
eval "$(aws configure export-credentials --format env)" && \
  AWS_REGION=us-west-2 \
  ./gradlew :curator:run --args="add -y https://www.audible.com/pd/Book-Title/B0XXXXXXXX"

# Export from production
eval "$(aws configure export-credentials --format env)" && \
  AWS_REGION=us-west-2 \
  ./gradlew :curator:run --args="export -o data/books.json"
```

## Local Development

By default, Quarkus connects to LocalStack at `localhost:4566` with test credentials.

For production Lambda, `QUARKUS_PROFILE=prod` uses IAM role credentials.

## Terraform

```bash
cd terraform/environments/dev
eval $(aws configure export-credentials --format env)
terraform init
terraform plan
terraform apply
```
