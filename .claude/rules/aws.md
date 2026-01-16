# AWS Rules

## SSO Credential Handling

The Java SDK doesn't support AWS SSO `login_session` directly. The Makefile handles credential export automatically via the `aws-login` target.

## Production Curator Commands

**IMPORTANT: Always use `make` targets, never run `gradlew` directly.**

```bash
make add URL=https://www.audible.com/pd/Book-Title/B0XXXXXXXX  # Add book
make list           # List all books
make export-prod    # Export to data/books-prod.json
make stats          # View analytics
make help           # Show all commands
```

## Local Development

By default, Quarkus connects to LocalStack at `localhost:4566` with test credentials.

For production Lambda, `QUARKUS_PROFILE=prod` uses IAM role credentials.

## Terraform

```bash
make deploy-infra   # Apply Terraform (handles credentials automatically)
```
