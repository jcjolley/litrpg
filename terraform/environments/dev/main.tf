terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "litrpg"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ECR repository for Lambda container images (only needed for container deployment)
module "ecr" {
  count  = var.deployment_type == "container" ? 1 : 0
  source = "../../modules/ecr"

  repository_name = var.ecr_repository_name
}

# DynamoDB table for book metadata
module "dynamodb" {
  source = "../../modules/dynamodb"

  table_name  = var.dynamodb_table_name
  enable_pitr = false # Disabled for dev, enable for prod
}

# API Gateway (HTTP API v2)
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name          = var.api_name
  lambda_invoke_arn = module.lambda.invoke_arn
  cors_origins      = var.cors_origins
}

# Lambda function for Quarkus API (native)
module "lambda" {
  source = "../../modules/lambda"

  environment               = var.environment
  function_name             = var.lambda_function_name
  dynamodb_table_arn        = module.dynamodb.table_arn
  dynamodb_table_name       = module.dynamodb.table_name
  api_gateway_execution_arn = module.api_gateway.execution_arn
  memory_size               = var.lambda_memory_size
  timeout                   = var.lambda_timeout

  # Deployment type: "zip" (simpler) or "container" (more control)
  deployment_type     = var.deployment_type
  zip_file_path       = var.deployment_type == "zip" ? var.zip_file_path : null
  container_image_uri = var.deployment_type == "container" ? "${module.ecr[0].repository_url}:${var.container_image_tag}" : null
}

# Frontend hosting (S3 + CloudFront)
module "frontend" {
  source = "../../modules/frontend"

  bucket_name     = var.frontend_bucket_name
  api_gateway_url = module.api_gateway.api_endpoint
}
