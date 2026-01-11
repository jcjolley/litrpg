# Dev environment configuration
aws_region   = "us-east-1"
environment  = "dev"

# DynamoDB
dynamodb_table_name = "litrpg-books-dev"

# Lambda
lambda_function_name = "litrpg-api-dev"
lambda_zip_path      = "../../../build/function.zip"
lambda_memory_size   = 256
lambda_timeout       = 30

# API Gateway
api_name     = "litrpg-api-dev"
cors_origins = ["*"]

# Frontend
frontend_bucket_name = "litrpg-frontend-dev"
