#!/bin/bash
set -e

# Build native Lambda container locally for testing
# Usage: ./scripts/build-native.sh

echo "=== Building LitRPG API Native Image ==="
echo ""

# Step 1: Build native executable with GraalVM
echo "=== Step 1: Building native executable (this takes 10-30 minutes) ==="
./gradlew build -Dquarkus.native.enabled=true -Dquarkus.native.container-build=true
echo ""

# Step 2: Build Docker image
echo "=== Step 2: Building Docker container ==="
docker build -f src/main/docker/Dockerfile.native-lambda -t litrpg-api:native .
echo ""

# Check image size
echo "=== Image Info ==="
docker images litrpg-api:native
echo ""

echo "=== Build complete! ==="
echo ""
echo "To test locally with Lambda Runtime Interface Emulator:"
echo "  docker run --rm -p 9000:8080 litrpg-api:native"
echo ""
echo "Then invoke with:"
echo "  curl -XPOST 'http://localhost:9000/2015-03-31/functions/function/invocations' \\"
echo "    -d '{\"requestContext\":{\"http\":{\"method\":\"GET\",\"path\":\"/hello\"}}}'"
