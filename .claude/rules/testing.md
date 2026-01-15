# Testing Rules

## Philosophy

- Test real behavior through the system, not isolated units
- Zero mocks is the ideal; only mock at system boundaries
- Use actual databases and services via containers

## Infrastructure by Module

| Module | Approach |
|--------|----------|
| Main API | Quarkus Dev Services auto-provisions DynamoDB, LocalStack |
| Curator CLI | Testcontainers with manually configured DynamoDB Local |
| UI (React) | Testing Library + MSW for API mocking |

## Quarkus Dev Services

Running `./gradlew quarkusDev` or `./gradlew test` auto-starts required containers. No manual setup needed.

## Testcontainers Pattern (Curator)

See `curator/src/test/kotlin/org/jcjolley/curator/repository/BookRepositoryTest.kt` for the standard pattern.

## Commands

```bash
./gradlew test                    # All tests
./gradlew :curator:test           # Curator module only
./gradlew test --tests "*.BookRepositoryTest"  # Single class
```
