# Initialize LocalStack DynamoDB with books table and sample data

$ErrorActionPreference = "Stop"

$ENDPOINT = "http://localhost:4566"
$TABLE_NAME = "litrpg-books-dev"
$REGION = "us-east-1"

Write-Host "Creating DynamoDB table: $TABLE_NAME"

# Create the table
try {
    aws dynamodb create-table `
        --endpoint-url $ENDPOINT `
        --table-name $TABLE_NAME `
        --attribute-definitions AttributeName=id,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --region $REGION 2>$null
    Write-Host "Table created"
} catch {
    Write-Host "Table may already exist"
}

# Import sample data or real data
$dataFile = if (Test-Path "data/books.json") { "data/books.json" } else { "data/sample-books.json" }

Write-Host "Importing books from $dataFile..."
& ./gradlew :curator:run --args="import $dataFile --dynamo $ENDPOINT" --quiet

Write-Host ""
Write-Host "Done! LocalStack DynamoDB is ready."
Write-Host "Start Quarkus with: ./gradlew quarkusDev -Dquarkus.profile=local"
