variable "environment" {
  type        = string
  description = "Deployment environment (e.g. production, staging)"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for the VPC"
}

variable "availability_zones" {
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
  description = "List of availability zones for multi-AZ deployment"
}
