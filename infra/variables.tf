variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Target AWS Region"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Target environment name (production, staging)"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "VPC CIDR block"
}

variable "availability_zones" {
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
  description = "Availability zones to deploy into"
}

variable "db_instance_class" {
  type        = string
  default     = "db.t4g.small"
  description = "RDS PostgreSQL instance type"
}

variable "db_name" {
  type        = string
  default     = "taskflow"
  description = "Master PostgreSQL database name"
}

variable "db_username" {
  type        = string
  default     = "taskflow_admin"
  description = "Master PostgreSQL username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  default     = "ChangeMeInTfvars123!"
  description = "Master PostgreSQL password"
}

variable "redis_node_type" {
  type        = string
  default     = "cache.t4g.micro"
  description = "ElastiCache Redis node type"
}

variable "api_image" {
  type        = string
  default     = "ghcr.io/sillibilli1/taskflow-api:latest"
  description = "Docker image for API container"
}

variable "worker_image" {
  type        = string
  default     = "ghcr.io/sillibilli1/taskflow-worker:latest"
  description = "Docker image for Worker container"
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "Optional ACM certificate ARN for HTTPS termination on the ALB"
}
