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

# us-east-1 provider for ACM certificates (required for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "litrpg"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ============================================================================
# Custom Domain Setup (optional - only if domain_name is set)
# ============================================================================

# Get existing hosted zone (created by Route 53 domain registration)
data "aws_route53_zone" "main" {
  count = var.domain_name != null ? 1 : 0
  name  = var.domain_name
}

# ACM Certificate for HTTPS (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "main" {
  count                     = var.domain_name != null ? 1 : 0
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = var.domain_name
  }
}

# DNS validation records for ACM certificate
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != null ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main[0].zone_id
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "main" {
  count                   = var.domain_name != null ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ============================================================================
# Core Infrastructure
# ============================================================================

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
  enable_pitr = var.enable_pitr
}

# API Gateway (HTTP API v2)
module "api_gateway" {
  source = "../../modules/api-gateway"

  api_name          = var.api_name
  lambda_invoke_arn = module.lambda.invoke_arn
  cors_origins      = var.domain_name != null ? ["https://${var.domain_name}", "https://www.${var.domain_name}"] : var.cors_origins
}

# Lambda function for Quarkus API (native)
module "lambda" {
  source = "../../modules/lambda"

  environment               = var.environment
  function_name             = var.lambda_function_name
  dynamodb_table_arn        = module.dynamodb.table_arn
  dynamodb_table_name       = module.dynamodb.table_name
  announcements_table_arn   = module.dynamodb.announcements_table_arn
  announcements_table_name  = module.dynamodb.announcements_table_name
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
  domain_name     = var.domain_name
  certificate_arn = var.domain_name != null ? aws_acm_certificate_validation.main[0].certificate_arn : null
}

# ============================================================================
# DNS Records pointing to CloudFront (only if custom domain is set)
# ============================================================================

# A record for root domain
resource "aws_route53_record" "root" {
  count   = var.domain_name != null ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.frontend.cloudfront_domain_name
    zone_id                = module.frontend.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

# A record for www subdomain
resource "aws_route53_record" "www" {
  count   = var.domain_name != null ? 1 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.frontend.cloudfront_domain_name
    zone_id                = module.frontend.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}
