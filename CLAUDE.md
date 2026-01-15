# CLAUDE.md

## Project Overview

LitRPG is a multi-module Kotlin project for managing a catalog of LitRPG audiobooks with AI-powered curation:
- **Main API** (`src/`) - Quarkus REST API deployed to AWS Lambda
- **Curator CLI** (`curator/`) - Book management with Audible scraping and LLM summarization
- **React UI** (`ui/`) - Recommendation spinner with retro RPG aesthetics

## Quick Reference

```bash
make dev             # Start local dev (LocalStack + Quarkus + UI)
make test            # Run all tests
make build           # Build everything
make deploy          # Full deployment to AWS

# Curator CLI
./gradlew :curator:run --args="list"
./gradlew :curator:run --args="add <audible-url>"
./gradlew :curator:run --args="--help"

# Production AWS (prefix any command)
eval "$(aws configure export-credentials --format env)" && AWS_REGION=us-west-2 <command>
```

## Tech Stack

- **Language**: Kotlin 2.3.0 on JDK 21
- **API**: Quarkus 3.30.6 (native Lambda)
- **CLI**: Clikt 5.0.3
- **Database**: AWS DynamoDB (Enhanced Client)
- **HTTP**: Ktor Client 3.3.3
- **Scraping**: SkrapeIt
- **LLM**: Ollama (local)
- **Testing**: JUnit 5, Testcontainers, MockK, WireMock, Strikt

## Architecture

```
src/main/kotlin/org/jcjolley/books/     # REST API
curator/src/main/kotlin/.../curator/
  ├── commands/    # CLI subcommands
  ├── repository/  # DynamoDB persistence
  ├── scraper/     # Audible HTML parsing
  ├── llm/         # Ollama summarization
  └── model/       # Domain entities
```

**Data Flow**: `ScrapedBook` → `Book` → `BookEntity`

**Key Pattern**: Two-pass LLM summarization extracts structured facts, then generates 2-sentence blurb (30-70 words).

## Coding Philosophy

- **Immutable by default** - prefer `val`, use immutable data structures
- **DRY** - extract shared logic
- **YAGNI** - don't build until needed
- **Comments explain "why"** - code shows what

## Development

**Prerequisites**: JDK 21, Docker, Ollama

**Quick Start**: `make dev` starts everything (LocalStack, Quarkus, creates tables)

**Windows Docker**: Enable "Expose daemon on tcp://localhost:2375" for Testcontainers.

## Testing

- **Behavior tests over unit tests** - test real behavior, not isolated units
- **Minimal mocking** - prefer real dependencies via containers
- **Main API**: Quarkus Dev Services auto-provisions containers
- **Curator**: Testcontainers with DynamoDB Local
- **UI**: Testing Library + MSW (only acceptable mocking)

```bash
./gradlew test                              # All tests
./gradlew :curator:test                     # Curator only
./gradlew test --tests "*.BookRepositoryTest"  # Single class
```

## Infrastructure

AWS resources managed via Terraform in `terraform/`:
- **Lambda**: Quarkus native container (ECR)
- **API Gateway**: HTTP API v2
- **DynamoDB**: `litrpg-books-dev` table
- **S3 + CloudFront**: React UI hosting

```bash
make deploy-infra    # Apply Terraform
make deploy-ui       # Deploy UI to S3
```
