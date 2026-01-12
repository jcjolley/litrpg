variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "function_name" {
  description = "Lambda function name"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of DynamoDB table"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of DynamoDB table"
  type        = string
}

variable "deployment_type" {
  description = "Deployment type: 'zip' or 'container'"
  type        = string
  default     = "zip"

  validation {
    condition     = contains(["zip", "container"], var.deployment_type)
    error_message = "deployment_type must be 'zip' or 'container'"
  }
}

variable "zip_file_path" {
  description = "Path to function.zip (for zip deployment)"
  type        = string
  default     = null
}

variable "container_image_uri" {
  description = "ECR container image URI (for container deployment)"
  type        = string
  default     = null
}

variable "api_gateway_execution_arn" {
  description = "API Gateway execution ARN for Lambda permission"
  type        = string
}

variable "memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 128
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}
