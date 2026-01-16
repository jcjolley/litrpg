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
make list            # List all books (production)
make list-local      # List all books (local)
make add URL=<url>   # Add book from Audible/RoyalRoad
make help            # Show all available commands
```

## Build Tool Policy

**NEVER run `gradlew`, `npm`, or `docker compose` directly.** Always use `make` targets.

If functionality is missing from the Makefile, add a new target first. This ensures:
- Consistent environment setup
- Proper credential handling for AWS commands
- Reproducible builds across environments

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

## Workflow

- **PRD-first for multistep tasks** - When a task involves 3+ files or multiple steps: (1) check `docs/prd/` for existing PRD, (2) if none exists, draft one using `@docs/prd/TEMPLATE.md` and await approval, (3) only then implement.

## Multi-Session Development (Git Worktrees)

Multiple Claude sessions can work in parallel using git worktrees. Each session gets an isolated branch.

### Commands

```bash
make worktree-list      # See all worktrees and their status vs main
make worktree-sync      # Rebase current branch onto origin/main
make ship               # Test → merge → push → cleanup (run from worktree)
make worktree-cleanup   # Remove worktrees for already-merged branches
```

### Session Lifecycle

1. **Claude creates worktree** - Automatic via Claude Code's `--worktree` flag
2. **Work & commit** - Make changes, commit frequently with descriptive messages
3. **Ready to merge** - Run `make ship` which will:
   - Check for uncommitted changes (fails if dirty)
   - Rebase onto latest `origin/main` (fails if conflicts)
   - Run `make test` (fails if tests fail)
   - Fast-forward merge to main
   - Push to origin
   - Delete branch and remove worktree
4. **Other sessions rebase** - After a merge, other sessions run `make worktree-sync`

### Conflict Resolution

If `make ship` fails during rebase:
1. Resolve conflicts manually
2. Run `git rebase --continue`
3. Run `make ship` again

### Best Practices

- **Commit early, commit often** - Small commits are easier to rebase
- **Sync before starting new work** - Run `make worktree-sync` at session start
- **First-ready, first-merged** - Complete features merge first; others rebase after
- **Keep features small** - Reduces merge conflicts between sessions

## Development

**Prerequisites**: JDK 21, Docker, Ollama

**Quick Start**: `make dev` starts everything (LocalStack, Quarkus, creates tables)

**Windows Docker**: Enable "Expose daemon on tcp://localhost:2375" for Testcontainers.

## Testing

- **Behavior tests over unit tests** - test real behavior, not isolated units
- **Minimal mocking** - prefer real dependencies via containers
- **Main API**: External LocalStack for DynamoDB (Makefile manages), Quarkus Dev Services for Lambda simulation
- **Curator**: Testcontainers with DynamoDB Local
- **UI**: Testing Library + MSW (only acceptable mocking)

```bash
make test                              # All tests (starts LocalStack + creates table)
make test-class CLASS=BooksQueryTest   # Single test class
make localstack-init                   # Manual: start LocalStack and create DynamoDB table
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
