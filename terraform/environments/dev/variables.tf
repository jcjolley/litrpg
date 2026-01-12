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

# ECR
variable "ecr_repository_name" {
  description = "Name of the ECR repository"
  type        = string
  default     = "litrpg-api-dev"
}

# Lambda
variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "litrpg-api-dev"
}

variable "deployment_type" {
  description = "Lambda deployment type: 'zip' (simpler) or 'container' (more control)"
  type        = string
  default     = "zip"
}

variable "zip_file_path" {
  description = "Path to function.zip for ZIP deployment"
  type        = string
  default     = "../../../build/function.zip"
}

variable "container_image_tag" {
  description = "Container image tag (for container deployment)"
  type        = string
  default     = "latest"
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB (128 is sufficient for native)"
  type        = number
  default     = 128
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
