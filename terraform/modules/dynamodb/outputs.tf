output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.books.arn
}

output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.books.name
}

output "announcements_table_arn" {
  description = "ARN of the announcements DynamoDB table"
  value       = aws_dynamodb_table.announcements.arn
}

output "announcements_table_name" {
  description = "Name of the announcements DynamoDB table"
  value       = aws_dynamodb_table.announcements.name
}
