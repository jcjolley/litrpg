# Dev environment configuration
aws_region  = "us-west-2"
environment = "dev"

# DynamoDB
dynamodb_table_name = "litrpg-books-dev"

# Lambda - ZIP deployment (simpler, no ECR needed)
lambda_function_name = "litrpg-api-dev"
deployment_type      = "zip"
zip_file_path        = "../../../build/function.zip"
lambda_memory_size   = 256
lambda_timeout       = 30

# API Gateway
api_name     = "litrpg-api-dev"
cors_origins = ["*"]

# Frontend
frontend_bucket_name = "litrpg-frontend-dev"
