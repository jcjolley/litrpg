#!/bin/bash
# LocalStack init script for Quarkus Dev Services
# Creates DynamoDB table with GSIs matching production (Terraform)

set -e

TABLE_NAME="litrpg-books-test"

echo "Creating DynamoDB table $TABLE_NAME with GSIs..."
echo "GSIs: audibleUrl-index, royalRoadUrl-index, addedAt-index"

awslocal dynamodb create-table \
    --table-name $TABLE_NAME \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=audibleUrl,AttributeType=S \
        AttributeName=royalRoadUrl,AttributeType=S \
        AttributeName=gsiPartition,AttributeType=S \
        AttributeName=addedAt,AttributeType=N \
    --key-schema AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        '[
            {"IndexName": "audibleUrl-index", "KeySchema": [{"AttributeName": "audibleUrl", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}},
            {"IndexName": "royalRoadUrl-index", "KeySchema": [{"AttributeName": "royalRoadUrl", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}},
            {"IndexName": "addedAt-index", "KeySchema": [{"AttributeName": "gsiPartition", "KeyType": "HASH"}, {"AttributeName": "addedAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
        ]' \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

echo "DynamoDB table created with GSIs"
