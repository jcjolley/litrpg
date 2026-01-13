# Development startup script for Windows
# Starts LocalStack, creates DynamoDB table, imports sample data, and runs Quarkus + UI

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

Write-Host "=== Starting LitRPG Development Environment ===" -ForegroundColor Cyan

# 1. Start LocalStack
Write-Host ""
Write-Host "[1/5] Starting LocalStack..." -ForegroundColor Yellow
docker compose up -d
Start-Sleep -Seconds 3

Write-Host "Waiting for LocalStack to be ready..."
do {
    Start-Sleep -Seconds 1
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:4566/_localstack/health" -ErrorAction SilentlyContinue
    } catch {}
} until ($health.services.dynamodb -eq "available")
Write-Host "LocalStack is ready!" -ForegroundColor Green

# 2. Create DynamoDB table
Write-Host ""
Write-Host "[2/5] Creating DynamoDB table..." -ForegroundColor Yellow
$env:AWS_ACCESS_KEY_ID = "test"
$env:AWS_SECRET_ACCESS_KEY = "test"
try {
    aws dynamodb create-table `
        --endpoint-url http://localhost:4566 `
        --table-name litrpg-books-dev `
        --attribute-definitions AttributeName=id,AttributeType=S `
        --key-schema AttributeName=id,KeyType=HASH `
        --billing-mode PAY_PER_REQUEST `
        --region us-east-1 2>$null
} catch {
    Write-Host "Table already exists, skipping..." -ForegroundColor Gray
}

# 3. Import sample data
Write-Host ""
Write-Host "[3/5] Importing sample books..." -ForegroundColor Yellow
& ./gradlew :curator:run --args="import $ProjectRoot/data/sample-books.json --dynamo http://localhost:4566" --quiet

# 4. Start Quarkus in background
Write-Host ""
Write-Host "[4/5] Starting Quarkus backend..." -ForegroundColor Yellow
$quarkusJob = Start-Job -ScriptBlock {
    Set-Location $using:ProjectRoot
    & ./gradlew quarkusDev
}

Write-Host "Waiting for Quarkus to be ready..."
do {
    Start-Sleep -Seconds 2
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:8080/books" -ErrorAction SilentlyContinue
        $quarkusReady = $true
    } catch {
        $quarkusReady = $false
    }
} until ($quarkusReady)
Write-Host "Quarkus is ready!" -ForegroundColor Green

# 5. Start UI dev server
Write-Host ""
Write-Host "[5/5] Starting UI dev server..." -ForegroundColor Yellow
$uiJob = Start-Job -ScriptBlock {
    Set-Location "$using:ProjectRoot/ui"
    npm run dev
}

Write-Host ""
Write-Host "=== Development environment is ready! ===" -ForegroundColor Cyan
Write-Host "  - API:    http://localhost:8080" -ForegroundColor White
Write-Host "  - UI:     http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Gray

# Keep script running and handle cleanup
try {
    while ($true) {
        Receive-Job -Job $quarkusJob -ErrorAction SilentlyContinue
        Receive-Job -Job $uiJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Shutting down..." -ForegroundColor Yellow
    Stop-Job -Job $quarkusJob, $uiJob -ErrorAction SilentlyContinue
    Remove-Job -Job $quarkusJob, $uiJob -Force -ErrorAction SilentlyContinue
    docker compose down
}
