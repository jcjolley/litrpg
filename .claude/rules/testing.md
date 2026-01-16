# Testing Rules

## Philosophy

- Test real behavior through the system, not isolated units
- Zero mocks is the ideal; only mock at system boundaries
- Use actual databases and services via containers

## Infrastructure by Module

| Module | Approach |
|--------|----------|
| Main API | External LocalStack for DynamoDB + Quarkus Dev Services for Lambda simulation |
| Curator CLI | Testcontainers with manually configured DynamoDB Local |
| UI (React) | Testing Library + MSW for API mocking |

## Main API Testing

**DynamoDB**: Uses external LocalStack (started via `make localstack-init`)
- Avoids Windows/Podman issues with Testcontainers file mounts
- Table created by `scripts/init-localstack.sh` with all 7 GSIs
- `quarkus.dynamodb.devservices.enabled=false` in test config

**Lambda**: Quarkus Dev Services handles Lambda simulation automatically

**Table:** `litrpg-books-dev` (shared with local dev)

## Testcontainers Pattern (Curator)

See `curator/src/test/kotlin/org/jcjolley/curator/repository/BookRepositoryTest.kt` for the standard pattern.

## Commands

```bash
make test                              # All tests (auto-starts LocalStack)
make test-class CLASS=BooksQueryTest   # Single test class
make localstack-init                   # Start LocalStack and create table
```
