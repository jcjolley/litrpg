variable "api_name" {
  description = "API Gateway name"
  type        = string
}

variable "lambda_invoke_arn" {
  description = "Lambda invoke ARN"
  type        = string
}

variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["*"]
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "throttling_burst_limit" {
  description = "API Gateway throttling burst limit (max concurrent requests)"
  type        = number
  default     = 100
}

variable "throttling_rate_limit" {
  description = "API Gateway throttling rate limit (requests per second)"
  type        = number
  default     = 50
}
