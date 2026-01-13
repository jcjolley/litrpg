#!/bin/bash
# Initialize LocalStack DynamoDB with books table and sample data

set -e

ENDPOINT="http://localhost:4566"
TABLE_NAME="litrpg-books-dev"
REGION="us-east-1"

echo "Creating DynamoDB table: $TABLE_NAME"

# Create the table
aws dynamodb create-table \
    --endpoint-url $ENDPOINT \
    --table-name $TABLE_NAME \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region $REGION \
    2>/dev/null || echo "Table may already exist"

echo "Table created (or already exists)"

# Import data if books.json exists
if [ -f "data/books.json" ]; then
    echo "Importing books from data/books.json..."
    ./gradlew :curator:run --args="import data/books.json --dynamo $ENDPOINT" --quiet
else
    echo "No data/books.json found. Skipping import."
    echo "To populate:"
    echo "  1. Export from prod: ./gradlew :curator:run --args='export -o data/books.json'"
    echo "  2. Re-run this script"
fi

echo "Done! LocalStack DynamoDB is ready."
echo "Start Quarkus with: ./gradlew quarkusDev -Dquarkus.profile=local"
