variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "cors_allowed_origins" {
  type        = list(string)
  default     = ["*"]
  description = "Origins allowed to perform direct pre-signed S3 uploads and downloads"
}
