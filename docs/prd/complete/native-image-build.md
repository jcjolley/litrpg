# PRD: Quarkus Native Image Build

## Goal

Get the Quarkus REST API building as a GraalVM native image for deployment to AWS Lambda.

## First Principles: What Do We Actually Need?

### The Application Does
1. Serve REST endpoint `GET /books` - returns all books from DynamoDB
2. Connect to DynamoDB Enhanced Client
3. Run in AWS Lambda behind API Gateway

### Minimum Required Dependencies
| Dependency | Purpose |
|------------|---------|
| `quarkus-rest` | JAX-RS REST endpoints |
| `quarkus-rest-jackson` | JSON serialization |
| `quarkus-amazon-lambda-http` | Lambda + API Gateway integration |
| `quarkus-amazon-dynamodb-enhanced` | DynamoDB data access |
| `quarkus-kotlin` | Kotlin support |
| `url-connection-client` | AWS SDK HTTP client for Lambda |

### Potentially Unnecessary (Audit Needed)
| Dependency | Question |
|------------|----------|
| `quarkus-rest-client-jackson` | Are we making outbound REST calls? No - remove |
| `quarkus-smallrye-health` | Needed for Lambda? API Gateway handles health |
| `quarkus-smallrye-openapi` | Needed for Lambda? Nice for dev, bloats native |
| `quarkus-smallrye-fault-tolerance` | Using circuit breakers? Probably not |
| `quarkus-container-image-docker` | Needed? Or just use plain Docker build |
| `quarkus-s3` | Currently used? Check code |

## Current State Audit

### build.gradle.kts Issues
- Has `quarkus-rest-client-jackson` but no outbound REST clients exist
- Has observability dependencies that may not be needed for Lambda
- Has S3 dependency but no S3 code in main module

### application.properties Issues
```properties
# These may conflict or be unnecessary:
quarkus.native.enabled=true          # Forces native for all builds
quarkus.package.jar.enabled=false    # Disables JAR - breaks dev mode?
quarkus.container-image.build=false  # Confusing with native container build
quarkus.rest-client.audible.url=...  # No Audible client in main module
```

### Code Cleanup
- `GreetingResource.kt` - scaffolding leftover, remove
- `MyLivenessCheck.kt` - needed for Lambda? Probably not

## Tasks

### Phase 1: Clean Slate Configuration

#### 1.1 Simplify build.gradle.kts
Remove unnecessary dependencies:
- [ ] Remove `quarkus-rest-client-jackson` (no outbound REST calls)
- [ ] Remove `quarkus-smallrye-openapi` (not needed in Lambda)
- [ ] Remove `quarkus-smallrye-fault-tolerance` (not using circuit breakers)
- [ ] Remove `quarkus-s3` (not used in main module)
- [ ] Evaluate `quarkus-smallrye-health` (API Gateway handles health)
- [ ] Evaluate `quarkus-container-image-docker` (may use plain Dockerfile)

#### 1.2 Clean application.properties
Reset to minimal config:
```properties
# Application
quarkus.application.name=litrpg-api

# DynamoDB
quarkus.dynamodb.aws.region=${AWS_REGION:us-east-1}
quarkus.dynamodb.aws.credentials.type=default
dynamodb.table.name=${DYNAMODB_TABLE_NAME:litrpg-books-dev}

# CORS (for local dev only - API Gateway handles in prod)
%dev.quarkus.http.cors=true
%dev.quarkus.http.cors.origins=*
```

Native build settings should be passed via command line, not hardcoded:
```bash
./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true
```

#### 1.3 Remove Scaffolding Code
- [ ] Delete `GreetingResource.kt`
- [ ] Delete `MyLivenessCheck.kt` (or keep if health checks needed)
- [ ] Update tests accordingly

### Phase 2: Native Build

#### 2.1 Attempt JVM Build First
```bash
./gradlew build
```
Verify JVM build works before attempting native.

#### 2.2 Attempt Native Build
```bash
./gradlew build \
  -Dquarkus.native.enabled=true \
  -Dquarkus.native.container-build=true \
  -Dquarkus.native.builder-image=quay.io/quarkus/ubi-quarkus-mandrel-builder-image:jdk-21
```

#### 2.3 Fix Issues As They Arise
Common native issues:
- **Reflection**: Add `@RegisterForReflection` to `Book` class
- **Serialization**: Ensure Jackson can handle Kotlin data classes
- **Missing classes**: Add to reflect-config.json if needed

### Phase 3: Lambda Deployment

#### 3.1 Build Lambda-Compatible Container
Quarkus generates a Lambda-ready container with `quarkus-amazon-lambda-http`.

```bash
./gradlew build \
  -Dquarkus.native.enabled=true \
  -Dquarkus.native.container-build=true \
  -Dquarkus.container-image.build=true \
  -Dquarkus.container-image.group=<ecr-registry> \
  -Dquarkus.container-image.name=litrpg-api \
  -Dquarkus.container-image.tag=latest
```

#### 3.2 Push to ECR and Deploy
```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push <ecr-url>:latest

# Deploy via Terraform
cd terraform/environments/dev && terraform apply
```

## Success Criteria

- [ ] JVM build succeeds with minimal dependencies
- [ ] Native build completes (3-5 min build time expected)
- [ ] Native executable runs locally and responds to `/books`
- [ ] Container image builds successfully
- [ ] Lambda cold start < 1 second
- [ ] `GET /books` returns data from DynamoDB

## Files to Modify

| File | Action |
|------|--------|
| `build.gradle.kts` | Remove unnecessary dependencies |
| `application.properties` | Simplify, remove hardcoded native config |
| `GreetingResource.kt` | Delete |
| `MyLivenessCheck.kt` | Delete (or keep if needed) |
| `Book.kt` | Add `@RegisterForReflection` if needed |
| `GreetingResourceTest.kt` | Delete (if exists) |

## Out of Scope

- CI/CD pipeline
- Production Terraform environment
- Performance optimization beyond working cold start
