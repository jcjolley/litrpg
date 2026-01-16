# Initialize LocalStack DynamoDB with books table, announcements table, and GSIs

$ErrorActionPreference = "Stop"

$ENDPOINT = "http://localhost:4566"
$TABLE_NAME = "litrpg-books-dev"
$ANNOUNCEMENTS_TABLE_NAME = "litrpg-books-dev-announcements"
$REGION = "us-east-1"

Write-Host "Setting up DynamoDB table: $TABLE_NAME"
Write-Host "GSIs: audibleUrl-index, royalRoadUrl-index, addedAt-index"

# Delete existing table if it exists (to ensure GSIs are created properly)
try {
    aws dynamodb delete-table `
        --endpoint-url $ENDPOINT `
        --table-name $TABLE_NAME `
        --region $REGION 2>$null
    Start-Sleep -Seconds 2
} catch {
    # Table doesn't exist, that's fine
}

Write-Host "Creating table with GSIs..."

# Create the table with all GSIs to match production
$gsiJson = @'
[
    {"IndexName": "audibleUrl-index", "KeySchema": [{"AttributeName": "audibleUrl", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}},
    {"IndexName": "royalRoadUrl-index", "KeySchema": [{"AttributeName": "royalRoadUrl", "KeyType": "HASH"}], "Projection": {"ProjectionType": "ALL"}},
    {"IndexName": "addedAt-index", "KeySchema": [{"AttributeName": "gsiPartition", "KeyType": "HASH"}, {"AttributeName": "addedAt", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}
]
'@

aws dynamodb create-table `
    --endpoint-url $ENDPOINT `
    --table-name $TABLE_NAME `
    --attribute-definitions `
        AttributeName=id,AttributeType=S `
        AttributeName=audibleUrl,AttributeType=S `
        AttributeName=royalRoadUrl,AttributeType=S `
        AttributeName=gsiPartition,AttributeType=S `
        AttributeName=addedAt,AttributeType=N `
    --key-schema AttributeName=id,KeyType=HASH `
    --global-secondary-indexes $gsiJson `
    --billing-mode PAY_PER_REQUEST `
    --region $REGION

Write-Host "Table with all GSIs created successfully"

# Create announcements table
Write-Host "Setting up announcements table: $ANNOUNCEMENTS_TABLE_NAME"

try {
    aws dynamodb delete-table `
        --endpoint-url $ENDPOINT `
        --table-name $ANNOUNCEMENTS_TABLE_NAME `
        --region $REGION 2>$null
    Start-Sleep -Seconds 1
} catch {
    # Table doesn't exist, that's fine
}

Write-Host "Creating announcements table..."

aws dynamodb create-table `
    --endpoint-url $ENDPOINT `
    --table-name $ANNOUNCEMENTS_TABLE_NAME `
    --attribute-definitions AttributeName=id,AttributeType=S `
    --key-schema AttributeName=id,KeyType=HASH `
    --billing-mode PAY_PER_REQUEST `
    --region $REGION

Write-Host "Announcements table created successfully"

Write-Host ""
Write-Host "Done! LocalStack DynamoDB is ready."
Write-Host "Start Quarkus with: ./gradlew quarkusDev -Dquarkus.profile=local"
