# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LitRPG is a multi-module Kotlin project for managing a catalog of LitRPG audiobooks with AI-powered curation. It consists of:
- **Main API Module** - Quarkus-based REST API deployed to AWS Lambda
- **Curator CLI Module** - Command-line tool for managing books with Audible scraping and LLM summarization
- **React UI** - Recommendation spinner with retro RPG aesthetics (in `ui/` folder)

## Build Commands

```bash
# Main API
./gradlew quarkusDev              # Run in dev mode with live reload
./gradlew build                   # Package application
./gradlew test                    # Run all tests

# Curator CLI
./gradlew :curator:run --args="list"              # List all books
./gradlew :curator:run --args="add <audible-url>" # Add book from Audible
./gradlew :curator:run --args="--help"            # Show available commands
./gradlew :curator:test                           # Run curator tests

# Native build for Lambda
./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true
```

## Tech Stack

- **Language**: Kotlin 2.3.0 on JDK 21
- **Web Framework**: Quarkus 3.30.6
- **CLI Framework**: Clikt 5.0.3
- **Database**: AWS DynamoDB (Enhanced Client)
- **HTTP Client**: Ktor Client 3.3.3
- **Web Scraping**: SkrapeIt
- **LLM**: Ollama (local inference)
- **Testing**: JUnit 5, Testcontainers, MockK, WireMock, Strikt

## Architecture

### Two-Module Structure
- `src/main/kotlin/org/jcjolley/books/` - REST API (Book entity, BooksService, REST resources)
- `curator/src/main/kotlin/org/jcjolley/curator/` - CLI with layered architecture:
  - `commands/` - CLI subcommands (add, list, update, remove, export, import)
  - `repository/` - DynamoDB persistence
  - `scraper/` - Audible HTML parsing
  - `llm/` - Ollama integration for summarization
  - `model/` - Domain entities (Book, ScrapedBook, BookFacts)

### Key Patterns
- **Two-Pass LLM Summarization**: Extract structured facts from Audible description, then generate concise 2-sentence blurb (30-70 words)
- **Data Model Conversion**: `ScrapedBook` (raw Audible data) → `Book` (enhanced domain model with metrics) → `BookEntity` (DynamoDB bean)
- **Extension functions** for type-safe conversions (e.g., `Book.toEntity()`)

### Infrastructure
See the Terraform section below for full details on AWS deployment.

## Coding Philosophy

- **Immutable by default** - prefer `val` over `var`, use immutable data structures
- **DRY** - Don't Repeat Yourself; extract shared logic
- **YAGNI** - You Ain't Gonna Need It; don't build features until they're needed
- **Comments explain "why"** - the code shows what; comments explain the reasoning

## Development Setup

**Prerequisites**: JDK 21, Docker (for Testcontainers), Ollama running locally for curator

**Docker on Windows**: Enable "Expose daemon on tcp://localhost:2375" in Docker Desktop settings for Testcontainers to work.

**Ollama**: Start with `ollama serve` before using curator's add command.

### Local Development with LocalStack

The app defaults to LocalStack for local development.

**Quick Start (Recommended)**: Use the startup script to launch everything:
```bash
# Windows
./scripts/dev-start.ps1

# Linux/Mac
./scripts/dev-start.sh
```

**Manual Setup**: If you need more control:
```bash
# 1. Start LocalStack
docker compose up -d

# 2. Create table and load sample data
aws dynamodb create-table --endpoint-url http://localhost:4566 \
  --table-name litrpg-books-dev \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region us-east-1

./gradlew :curator:run --args="import data/books.json --dynamo http://localhost:4566"

# 3. Start Quarkus (defaults to LocalStack)
./gradlew quarkusDev

# 4. Start the UI (in another terminal)
cd ui && npm run dev
```

To use real production data locally:
```bash
# Export from prod (requires AWS auth)
./gradlew :curator:run --args="export -o data/books.json"

# Import to LocalStack
./gradlew :curator:run --args="import data/books.json --dynamo http://localhost:4566"
```

**Configuration**: By default, Quarkus connects to `localhost:4566` with test credentials. For production (Lambda), set `QUARKUS_PROFILE=prod` to use IAM role credentials.

## Testing Strategy

### Philosophy
- **Behavior tests over unit tests** - test real behavior through the system, not isolated units
- **Minimal mocking** - ideally zero mocks; prefer real dependencies
- **Real infrastructure** - use actual databases and services via containers

### Infrastructure by Module

| Module | Approach |
|--------|----------|
| Main API (Quarkus) | Quarkus Dev Services - auto-provisions DynamoDB Local, LocalStack, etc. |
| Curator CLI | Testcontainers - manually configured DynamoDB Local container |
| UI (React) | Testing Library with MSW for API mocking (only place mocking is acceptable) |

### Quarkus Dev Services
When running `./gradlew quarkusDev` or `./gradlew test` in the main module, Quarkus automatically starts required containers (DynamoDB, S3, etc.) via Dev Services. No manual container setup needed.

### Testcontainers (Curator)
For the curator module outside Quarkus, use Testcontainers directly. See `curator/src/test/kotlin/org/jcjolley/curator/repository/BookRepositoryTest.kt` for the pattern.

### Commands
```bash
./gradlew test                    # All tests
./gradlew :curator:test           # Curator module only
./gradlew test --tests "*.BookRepositoryTest"  # Single test class
```

## UI - Recommendation Spinner

### Concept
A horizontal carousel that spins and slowly stops on a single LitRPG audiobook recommendation. Styled with SNES Final Fantasy-inspired "System" dialogs featuring classic blue gradient boxes with white borders and pixel fonts.

### User Flow
1. Page loads → carousel auto-spins
2. Carousel slows and stops on a random book (weighted by metrics)
3. System dialog appears showing: cover image, title, AI-generated 2-sentence blurb
4. User can:
   - **Wishlist** - saves to browser local storage
   - **Spin Again** - triggers another spin
   - **Ignore** - dismisses without action
   - **Click elsewhere** - navigates to Audible page for that book

### Tech Stack & Structure
- React with TypeScript in `ui/` folder
- Deployed to S3 + CloudFront
- Calls the Quarkus REST API (`/books`) for catalog data

### Recommendation Algorithm
Weighted random selection factoring in book metrics (wishlistCount, impressions, clickThroughCount) stored in DynamoDB.

### Visual Style
- Blue gradient dialog boxes (classic FF style)
- White/light borders
- Pixel/retro font for system text
- Book covers prominently displayed

## Terraform Infrastructure

### Structure
```
terraform/
├── environments/
│   └── dev/                    # Dev environment configuration
│       ├── main.tf             # Module composition
│       ├── variables.tf        # Environment-specific vars
│       └── outputs.tf
└── modules/
    ├── ecr/                    # Container registry for Lambda images
    ├── dynamodb/               # Books table
    ├── lambda/                 # Quarkus native Lambda function
    ├── api-gateway/            # HTTP API v2
    └── frontend/               # S3 + CloudFront for React UI
```

### Commands
```bash
cd terraform/environments/dev

# Export AWS credentials for Terraform (required on Windows with AWS CLI login session)
eval $(aws configure export-credentials --format env)

terraform init                  # Initialize providers and modules
terraform plan                  # Preview changes
terraform apply                 # Deploy infrastructure
terraform destroy               # Tear down (use with caution)
```

### AWS Resources
- **ECR**: Container registry storing Quarkus native Lambda images
- **DynamoDB**: `litrpg-books-dev` table with `id` partition key
- **Lambda**: Quarkus native container running the REST API
- **API Gateway**: HTTP API v2 proxying to Lambda
- **S3 + CloudFront**: Static hosting for React UI
  - CloudFront routes `/api/*` to API Gateway, everything else to S3
  - SPA routing configured (404s return index.html)

### Deployment Flow
1. Build native container: `./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true`
2. Push to ECR: `docker push <ecr-url>:latest`
3. Deploy infra: `terraform apply`
4. Deploy UI: Upload `ui/dist/` to S3 bucket
