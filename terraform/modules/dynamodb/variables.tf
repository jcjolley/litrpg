variable "table_name" {
  description = "Name of the DynamoDB table"
  type        = string
}

variable "enable_pitr" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = false
}
