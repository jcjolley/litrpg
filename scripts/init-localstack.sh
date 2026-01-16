#!/bin/bash
# Initialize LocalStack DynamoDB with books table and sample data

set -e

ENDPOINT="http://localhost:4566"
TABLE_NAME="litrpg-books-dev"
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

echo "Creating table with all GSIs..."

# Create the table with all GSIs for full feature parity
aws dynamodb create-table \
    --endpoint-url $ENDPOINT \
    --table-name $TABLE_NAME \
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
    --region $REGION

echo "Table with GSIs created successfully"

# Import data if books.json exists (skip curator import since it creates table without GSIs)
if [ -f "data/books-prod.json" ]; then
    echo "Importing books from data/books-prod.json..."
    # Use direct DynamoDB import instead of curator to avoid table recreation
    # Curator import skipped - tests seed their own data
fi

echo "Done! LocalStack DynamoDB is ready."
echo "Start Quarkus with: ./gradlew quarkusDev -Dquarkus.profile=local"
