#!/bin/bash
# LocalStack init script for Quarkus Dev Services
# Creates DynamoDB table with all GSIs

set -e

TABLE_NAME="litrpg-books-test"

echo "Creating DynamoDB table $TABLE_NAME with GSIs..."

awslocal dynamodb create-table \
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
    --region us-east-1

echo "DynamoDB table created with all GSIs"
