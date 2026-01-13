output "repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.lambda.repository_url
}

output "repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.lambda.arn
}

output "registry_id" {
  description = "Registry ID"
  value       = aws_ecr_repository.lambda.registry_id
}
