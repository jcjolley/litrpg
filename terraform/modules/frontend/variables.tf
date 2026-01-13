variable "bucket_name" {
  description = "S3 bucket name prefix (account ID will be appended)"
  type        = string
}

variable "api_gateway_url" {
  description = "API Gateway endpoint URL for backend proxying"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name (optional)"
  type        = string
  default     = null
}

variable "certificate_arn" {
  description = "ACM certificate ARN for custom domain (required if domain_name is set)"
  type        = string
  default     = null
}
