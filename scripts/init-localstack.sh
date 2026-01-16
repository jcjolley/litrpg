#!/bin/bash
# Initialize LocalStack DynamoDB with books table, announcements table, and sample data

set -e

ENDPOINT="http://localhost:4566"
TABLE_NAME="litrpg-books-dev"
ANNOUNCEMENTS_TABLE_NAME="litrpg-books-dev-announcements"
REGION="us-east-1"

echo "Setting up DynamoDB table with GSIs: $TABLE_NAME"

# Delete existing table if it exists (to ensure GSIs are created properly)
aws dynamodb delete-table \
    --endpoint-url $ENDPOINT \
    --table-name $TABLE_NAME \
    --region $REGION \
    2>/dev/null || true

# Wait for deletion to complete
sleep 2

echo "Creating table with addedAt-index GSI..."

# Create the table with only addedAt-index GSI (other filtering done in-memory)
aws dynamodb create-table \
    --endpoint-url $ENDPOINT \
    --table-name $TABLE_NAME \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
      AttributeName=gsiPartition,AttributeType=S \
      AttributeName=addedAt,AttributeType=N \
    --key-schema AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
      '[
        {"IndexName": "addedAt-index", "KeySchema": [{"AttributeName": "gsiPartition", "KeyType": "HASH"}, {"AttributeName": "addedAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
      ]' \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION

echo "Table with addedAt-index GSI created successfully"

# Import data if books.json exists (skip curator import since it creates table without GSIs)
if [ -f "data/books-prod.json" ]; then
    echo "Importing books from data/books-prod.json..."
    # Use direct DynamoDB import instead of curator to avoid table recreation
    # Curator import skipped - tests seed their own data
fi

# Create announcements table
echo "Setting up announcements table: $ANNOUNCEMENTS_TABLE_NAME"

# Delete existing announcements table if it exists
aws dynamodb delete-table \
    --endpoint-url $ENDPOINT \
    --table-name $ANNOUNCEMENTS_TABLE_NAME \
    --region $REGION \
    2>/dev/null || true

# Wait for deletion to complete
sleep 1

echo "Creating announcements table..."

aws dynamodb create-table \
    --endpoint-url $ENDPOINT \
    --table-name $ANNOUNCEMENTS_TABLE_NAME \
    --attribute-definitions \
      AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION

echo "Announcements table created successfully"

echo "Done! LocalStack DynamoDB is ready."
echo "Start Quarkus with: ./gradlew quarkusDev -Dquarkus.profile=local"
