variable "bucket_name" {
  description = "S3 bucket name prefix (account ID will be appended)"
  type        = string
}

variable "api_gateway_url" {
  description = "API Gateway endpoint URL for backend proxying"
  type        = string
}
