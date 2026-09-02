variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs for the ALB"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for ECS tasks"
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

variable "api_cpu" {
  type        = number
  default     = 256
  description = "CPU units for API container (256 = 0.25 vCPU)"
}

variable "api_memory" {
  type        = number
  default     = 512
  description = "Memory for API container in MB"
}

variable "worker_cpu" {
  type        = number
  default     = 256
  description = "CPU units for Worker container"
}

variable "worker_memory" {
  type        = number
  default     = 512
  description = "Memory for Worker container in MB"
}

variable "api_desired_count" {
  type        = number
  default     = 2
  description = "Desired number of API task instances"
}

variable "worker_desired_count" {
  type        = number
  default     = 1
  description = "Desired number of Worker task instances"
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN for HTTPS listener (optional)"
}
