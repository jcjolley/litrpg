#!/bin/bash
# Development startup script
# Starts LocalStack, creates DynamoDB table, imports sample data, and runs Quarkus + UI

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Starting LitRPG Development Environment ==="

# 1. Start LocalStack
echo ""
echo "[1/5] Starting LocalStack..."
docker compose up -d
sleep 3

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
#until curl -s http://localhost:4566/_localstack/health | grep -q '"dynamodb": "available"'; do
#  sleep 1
#done
echo "LocalStack is ready!"

# 2. Create DynamoDB table (ignore error if already exists)
echo ""
echo "[2/5] Creating DynamoDB table..."
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test aws dynamodb create-table \
  --endpoint-url http://localhost:4566 \
  --table-name litrpg-books-dev \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1 2>/dev/null || echo "Table already exists, skipping..."

# 3. Import sample data
echo ""
echo "[3/5] Importing sample books..."
# Convert path for Windows compatibility
SAMPLE_FILE=$(cygpath -w "$PROJECT_ROOT/data/sample-books.json" 2>/dev/null || echo "$PROJECT_ROOT/data/sample-books.json")
./gradlew :curator:run --args="import $SAMPLE_FILE --dynamo http://localhost:4566" --quiet

# 4. Start Quarkus in background
echo ""
echo "[4/5] Starting Quarkus backend..."
./gradlew quarkusDev &
QUARKUS_PID=$!

# Wait for Quarkus to be ready
echo "Waiting for Quarkus to be ready..."
#until curl -s http://localhost:8080/books > /dev/null 2>&1; do
#  sleep 2
#done
echo "Quarkus is ready!"

# 5. Start UI dev server
echo ""
echo "[5/5] Starting UI dev server..."
cd ui
npm run dev &
UI_PID=$!

echo ""
echo "=== Development environment is ready! ==="
echo "  - API:    http://localhost:8080"
echo "  - UI:     http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle shutdown
trap "echo 'Shutting down...'; kill $QUARKUS_PID $UI_PID 2>/dev/null; docker compose down" EXIT

# Wait for processes
wait
