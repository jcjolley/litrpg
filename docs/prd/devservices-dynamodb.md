# Quarkus Dev Services DynamoDB Migration

## Overview
Migrate from manual LocalStack management to Quarkus Dev Services for DynamoDB, providing self-contained test environments that automatically provision and initialize the database with all required GSIs.

## Problem Statement
Current test setup requires:
1. Manually running `make localstack` before tests
2. External LocalStack container management
3. Tests fail with timeouts when Lambda simulation layer interacts with external LocalStack
4. Inconsistent state between test runs (table may or may not exist)

## Goals
- [ ] Tests run without external dependencies (self-contained)
- [ ] All GSIs automatically created on container startup
- [ ] Sample data optionally seeded for integration tests
- [ ] `make test` works without `make localstack` first

## Non-Goals
- Not changing production deployment (Terraform still manages prod DynamoDB)
- Not removing `make dev` workflow (keep for local UI development)
- Not modifying the Curator CLI module

---

## User Stories

### US-001: Self-Contained Test Execution
**As a** developer
**I want** tests to run without external setup
**So that** I can run `make test` without remembering to start LocalStack first

**Acceptance Criteria:**
- [ ] Given fresh checkout, when running `./gradlew test`, then tests pass
- [ ] Given no Docker containers running, when running tests, then Dev Services starts LocalStack automatically
- [ ] Given tests complete, when container stops, then no cleanup required

### US-002: Consistent GSI Configuration
**As a** developer
**I want** test DynamoDB to have all production GSIs
**So that** GSI-based queries work identically in tests and production

**Acceptance Criteria:**
- [ ] All 7 GSIs created: author-index, genre-index, popularity-index, length-index, narrator-index, source-index, addedAt-index
- [ ] GSI key schemas match Terraform definitions
- [ ] Tests using `getBooksAddedSince()` pass without timeout

---

## Phases

### Phase 1: Create LocalStack Init Script

**File:** `src/test/resources/localstack/init-dynamodb.sh`

Create an init script that Quarkus Dev Services will run when LocalStack starts.

**Important:** Script must have:
- `.sh` extension
- Shebang (`#!/bin/bash`)
- LF line endings (not CRLF - critical on Windows!)
- Use `awslocal` command (not `aws --endpoint-url`)

```bash
#!/bin/bash
# LocalStack init script for Quarkus Dev Services
# Creates DynamoDB table with all GSIs

awslocal dynamodb create-table \
    --table-name litrpg-books-test \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=author,AttributeType=S \
      AttributeName=genre,AttributeType=S \
      AttributeName=gsiPartition,AttributeType=S \
      AttributeName=lengthCategory,AttributeType=S \
      AttributeName=narrator,AttributeType=S \
      AttributeName=source,AttributeType=S \
      AttributeName=rating,AttributeType=N \
      AttributeName=numRatings,AttributeType=N \
      AttributeName=addedAt,AttributeType=N \
    --key-schema AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
      '[
        {"IndexName": "author-index", "KeySchema": [{"AttributeName": "author", "KeyType": "HASH"}, {"AttributeName": "rating", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "genre-index", "KeySchema": [{"AttributeName": "genre", "KeyType": "HASH"}, {"AttributeName": "numRatings", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "popularity-index", "KeySchema": [{"AttributeName": "gsiPartition", "KeyType": "HASH"}, {"AttributeName": "numRatings", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "length-index", "KeySchema": [{"AttributeName": "lengthCategory", "KeyType": "HASH"}, {"AttributeName": "rating", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "narrator-index", "KeySchema": [{"AttributeName": "narrator", "KeyType": "HASH"}, {"AttributeName": "rating", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "source-index", "KeySchema": [{"AttributeName": "source", "KeyType": "HASH"}, {"AttributeName": "rating", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "addedAt-index", "KeySchema": [{"AttributeName": "gsiPartition", "KeyType": "HASH"}, {"AttributeName": "addedAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
      ]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

echo "DynamoDB table created with all GSIs"
```

### Phase 2: Update Test application.properties

**File:** `src/test/resources/application.properties`

Enable Quarkus Dev Services and configure init script:

```properties
# Enable Dev Services DynamoDB (uses LocalStack)
quarkus.dynamodb.devservices.enabled=true

# Point to init script in classpath
quarkus.aws.devservices.localstack.init-scripts-classpath=localstack/init-dynamodb.sh

# Wait for init script completion message
quarkus.aws.devservices.localstack.init-completion-msg=DynamoDB table created with all GSIs

# Use test-specific table name
dynamodb.table.name=litrpg-books-test

# Remove manual endpoint override (Dev Services handles this)
# quarkus.dynamodb.endpoint-override is auto-configured by Dev Services
```

### Phase 3: Update Main application.properties

**File:** `src/main/resources/application.properties`

Disable dev services in main config (only enable in test):

```properties
# Disable dev services by default - tests override this
quarkus.dynamodb.devservices.enabled=false
```

### Phase 4: Restore Broken Test

**File:** `src/test/kotlin/org/jcjolley/books/BooksQueryTest.kt`

Restore the removed test now that Dev Services will properly handle the GSI:

```kotlin
@Test
fun `query with since returns books added after timestamp`() {
    val pastTimestamp = 1000L

    given()
        .`when`()
        .get("/books?since=$pastTimestamp")
        .then()
        .statusCode(200)
        .body("size()", greaterThan(0))
}
```

### Phase 5: Clean Up Redundant Service Test

**File:** `src/test/kotlin/org/jcjolley/books/BooksServiceTest.kt`

Remove or simplify - the service-layer test was a workaround. Can be deleted if BooksQueryTest covers all cases, or kept for faster unit-style tests.

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `src/test/resources/localstack/init-dynamodb.sh` | Init script for Dev Services LocalStack |

### Files to Modify
| File | Changes |
|------|---------|
| `src/test/resources/application.properties` | Enable Dev Services, configure init script |
| `src/main/resources/application.properties` | Ensure devservices.enabled=false for non-test |
| `src/test/kotlin/.../BooksQueryTest.kt` | Restore removed test |

### Files to Delete (Optional)
| File | Reason |
|------|--------|
| `src/test/kotlin/.../BooksServiceTest.kt` | Redundant if BooksQueryTest passes |

---

## Quality Gates

- `./gradlew test` - All tests pass without external LocalStack
- `./gradlew build` - Build succeeds
- Tests complete in reasonable time (no 60s+ timeouts)

---

## Verification Checklist

1. [ ] Stop any running LocalStack containers
2. [ ] Run `./gradlew test` → All tests pass
3. [ ] Check Docker → Dev Services container auto-started and stopped
4. [ ] `query with since returns books added after timestamp` → Passes without timeout
5. [ ] Run `make dev` → Still works for local UI development

---

## Implementation Order

1. Create `src/test/resources/localstack/init-dynamodb.sh`
2. Update `src/test/resources/application.properties` to enable Dev Services
3. Update `src/main/resources/application.properties` to disable Dev Services
4. Restore the removed test in BooksQueryTest.kt
5. Run tests to verify
6. Delete BooksServiceTest.kt if redundant

---

## Open Questions

- [ ] Should we keep BooksServiceTest for faster unit-style tests, or consolidate into BooksQueryTest?
- [ ] Do we need sample data seeded in the init script, or is test `@BeforeAll` sufficient?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dev Services slower startup | Low | LocalStack image is cached after first pull |
| Init script syntax errors | Medium | Test locally with `awslocal` before committing |
| Testcontainers Docker issues on Windows | Medium | Already working for other tests; same setup |
