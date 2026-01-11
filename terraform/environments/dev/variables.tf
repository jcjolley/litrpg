variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# DynamoDB
variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  type        = string
  default     = "litrpg-books-dev"
}

# Lambda
variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "litrpg-api-dev"
}

variable "lambda_zip_path" {
  description = "Path to the Lambda deployment package"
  type        = string
  default     = "../../../build/function.zip"
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

# API Gateway
variable "api_name" {
  description = "Name of the API Gateway"
  type        = string
  default     = "litrpg-api-dev"
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["*"]
}

# Frontend
variable "frontend_bucket_name" {
  description = "S3 bucket name prefix for frontend hosting"
  type        = string
  default     = "litrpg-frontend-dev"
}
