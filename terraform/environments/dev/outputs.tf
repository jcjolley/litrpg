output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = module.api_gateway.api_endpoint
}

output "ecr_repository_url" {
  description = "ECR repository URL for container images (only for container deployment)"
  value       = var.deployment_type == "container" ? module.ecr[0].repository_url : null
}

output "frontend_url" {
  description = "CloudFront distribution URL"
  value       = module.frontend.cloudfront_url
}

output "frontend_bucket" {
  description = "S3 bucket for frontend deployment"
  value       = module.frontend.bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = module.frontend.cloudfront_distribution_id
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = module.dynamodb.table_name
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.lambda.function_name
}
