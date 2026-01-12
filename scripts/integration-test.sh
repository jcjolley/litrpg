#!/bin/bash
#
# Integration Test: End-to-end test for LitRPG API
#
# This test:
# 1. Starts LocalStack with DynamoDB
# 2. Creates the books table
# 3. Imports a test book using the curator CLI
# 4. Runs the native image in Docker
# 5. Queries the /books endpoint and verifies the response
#
# Requirements:
# - Docker running
# - Native image built (./gradlew quarkusBuild -Dquarkus.native.enabled=true)
# - Curator CLI built (./gradlew :curator:installDist)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NETWORK_NAME="litrpg-test-network"
LOCALSTACK_CONTAINER="litrpg-localstack"
API_CONTAINER="litrpg-api-test"
TABLE_NAME="litrpg-books"
API_PORT=8080

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Cleaning up..."
    docker rm -f "$API_CONTAINER" 2>/dev/null || true
    docker rm -f "$LOCALSTACK_CONTAINER" 2>/dev/null || true
    docker network rm "$NETWORK_NAME" 2>/dev/null || true
}

# Cleanup on exit
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! docker version > /dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi

    NATIVE_IMAGE="$PROJECT_DIR/build/code-with-quarkus-1.0.0-SNAPSHOT-runner"
    if [ ! -f "$NATIVE_IMAGE" ]; then
        log_error "Native image not found at $NATIVE_IMAGE"
        log_error "Build it with: ./gradlew quarkusBuild -Dquarkus.native.enabled=true -Dquarkus.package.jar.enabled=false"
        exit 1
    fi

    CURATOR_SCRIPT="$PROJECT_DIR/curator/build/install/curator/bin/curator"
    if [ ! -f "$CURATOR_SCRIPT" ]; then
        log_warn "Curator CLI not found, building..."
        cd "$PROJECT_DIR" && ./gradlew :curator:installDist
    fi

    log_info "Prerequisites OK"
}

# Create Docker network
create_network() {
    log_info "Creating Docker network: $NETWORK_NAME"
    docker network create "$NETWORK_NAME" 2>/dev/null || true
}

# Start LocalStack
start_localstack() {
    log_info "Starting LocalStack..."

    docker run -d \
        --name "$LOCALSTACK_CONTAINER" \
        --network "$NETWORK_NAME" \
        -p 4566:4566 \
        -e SERVICES=dynamodb \
        -e DEBUG=0 \
        localstack/localstack:latest

    # Wait for LocalStack to be ready
    log_info "Waiting for LocalStack to be ready..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:4566/_localstack/health | grep -q '"dynamodb".*"available"'; then
            log_info "LocalStack is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    log_error "LocalStack failed to start"
    exit 1
}

# Create DynamoDB table
create_table() {
    log_info "Creating DynamoDB table: $TABLE_NAME"

    aws dynamodb create-table \
        --endpoint-url http://localhost:4566 \
        --table-name "$TABLE_NAME" \
        --attribute-definitions AttributeName=id,AttributeType=S \
        --key-schema AttributeName=id,KeyType=HASH \
        --billing-mode PAY_PER_REQUEST \
        --region us-east-1 \
        --no-cli-pager \
        > /dev/null

    log_info "Table created"
}

# Create and import test book
import_test_book() {
    log_info "Creating test book JSON..."

    local test_book_file="$PROJECT_DIR/build/test-book.json"

    cat > "$test_book_file" << 'EOF'
[
  {
    "id": "test-book-001",
    "title": "Defiance of the Fall",
    "subtitle": "A LitRPG Adventure",
    "author": "TheFirstDefier",
    "authorUrl": "https://www.audible.com/author/TheFirstDefier",
    "series": "Defiance of the Fall",
    "seriesPosition": 1,
    "length": "12 hrs 34 mins",
    "releaseDate": "01-15-2022",
    "language": "English",
    "imageUrl": "https://example.com/cover.jpg",
    "audibleUrl": "https://www.audible.com/pd/Defiance-of-the-Fall",
    "audibleAsin": "B09XYZ1234",
    "rating": 4.7,
    "numRatings": 12847,
    "description": "When the System arrives, Zac must survive the apocalypse and level up to protect what remains.",
    "wishlistCount": 0,
    "clickThroughCount": 0,
    "notInterestedCount": 0,
    "impressionCount": 0,
    "addedAt": 1704067200000,
    "updatedAt": 1704067200000
  }
]
EOF

    log_info "Importing test book via curator CLI..."

    cd "$PROJECT_DIR"
    ./curator/build/install/curator/bin/curator import \
        --dynamo "http://localhost:4566" \
        "$test_book_file"

    log_info "Test book imported"
}

# Run native image in Docker with Lambda Runtime Interface Emulator
run_native_api() {
    log_info "Starting native API with Lambda RIE..."

    local native_image="$PROJECT_DIR/build/code-with-quarkus-1.0.0-SNAPSHOT-runner"

    # Build a simple container with the native image and Lambda RIE
    # Download the RIE to project build directory
    local rie_path="$PROJECT_DIR/build/aws-lambda-rie"
    if [ ! -f "$rie_path" ]; then
        log_info "Downloading AWS Lambda RIE..."
        curl -Lo "$rie_path" \
            https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie-x86_64
        chmod +x "$rie_path"
    fi

    # Run the native image with RIE in an amazonlinux container
    # MSYS_NO_PATHCONV prevents Git Bash from converting Unix paths to Windows paths
    MSYS_NO_PATHCONV=1 docker run -d \
        --name "$API_CONTAINER" \
        --network "$NETWORK_NAME" \
        -p $API_PORT:8080 \
        -e QUARKUS_DYNAMODB_ENDPOINT_OVERRIDE="http://$LOCALSTACK_CONTAINER:4566" \
        -e DYNAMODB_TABLE_NAME="$TABLE_NAME" \
        -e AWS_ACCESS_KEY_ID=test \
        -e AWS_SECRET_ACCESS_KEY=test \
        -e AWS_REGION=us-east-1 \
        -v "$native_image:/var/task/bootstrap:ro" \
        -v "$rie_path:/usr/local/bin/aws-lambda-rie:ro" \
        --entrypoint /usr/local/bin/aws-lambda-rie \
        amazonlinux:2023 \
        /var/task/bootstrap

    # Wait for Lambda RIE to be ready
    log_info "Waiting for Lambda RIE to be ready..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        # Check if the container is still running
        if ! docker ps --filter "name=$API_CONTAINER" --format '{{.Names}}' | grep -q "$API_CONTAINER"; then
            log_error "Container stopped unexpectedly"
            docker logs "$API_CONTAINER"
            exit 1
        fi
        # Try to invoke the Lambda RIE health endpoint
        if curl -s "http://localhost:$API_PORT/2015-03-31/functions/function/invocations" -d '{}' > /dev/null 2>&1; then
            log_info "Lambda RIE is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done

    log_error "Lambda RIE failed to start"
    docker logs "$API_CONTAINER"
    exit 1
}

# Test the API via Lambda invocation
test_api() {
    log_info "Testing /books endpoint via Lambda..."

    # Create API Gateway HTTP API v2 event payload for GET /books
    local event_payload
    event_payload=$(cat << 'EVENTEOF'
{
  "version": "2.0",
  "routeKey": "GET /books",
  "rawPath": "/books",
  "rawQueryString": "",
  "headers": {
    "accept": "application/json",
    "content-type": "application/json"
  },
  "requestContext": {
    "accountId": "123456789012",
    "apiId": "api-id",
    "domainName": "id.execute-api.us-east-1.amazonaws.com",
    "domainPrefix": "id",
    "http": {
      "method": "GET",
      "path": "/books",
      "protocol": "HTTP/1.1",
      "sourceIp": "127.0.0.1",
      "userAgent": "curl/7.64.1"
    },
    "requestId": "id",
    "routeKey": "GET /books",
    "stage": "$default",
    "time": "12/Jan/2026:00:00:00 +0000",
    "timeEpoch": 1736640000000
  },
  "isBase64Encoded": false
}
EVENTEOF
)

    local response
    response=$(curl -s "http://localhost:$API_PORT/2015-03-31/functions/function/invocations" \
        -H "Content-Type: application/json" \
        -d "$event_payload")

    echo "Raw Lambda response: $response"

    # Check if response contains statusCode 200
    if ! echo "$response" | grep -q '"statusCode":200'; then
        log_error "Expected status 200 in response"
        exit 1
    fi
    log_info "Status code: 200 OK"

    # Extract body - the response format is {"statusCode":200,"body":"..."}
    # Use simple string manipulation since jq may not be available
    local body="$response"
    echo "Response body: $body"

    # Verify the response contains our test book
    if echo "$body" | grep -q "Defiance of the Fall"; then
        log_info "Test book found in response!"
    else
        log_error "Test book NOT found in response"
        exit 1
    fi

    if echo "$body" | grep -q "TheFirstDefier"; then
        log_info "Author found in response!"
    else
        log_error "Author NOT found in response"
        exit 1
    fi

    if echo "$body" | grep -q "test-book-001"; then
        log_info "Book ID found in response!"
    else
        log_error "Book ID NOT found in response"
        exit 1
    fi

    log_info "${GREEN}All tests passed!${NC}"
}

# Main execution
main() {
    log_info "Starting LitRPG Integration Test"
    echo "========================================"

    check_prerequisites
    cleanup  # Clean any leftover containers
    create_network
    start_localstack
    create_table
    import_test_book
    run_native_api
    test_api

    echo "========================================"
    log_info "Integration test completed successfully!"
}

main "$@"
