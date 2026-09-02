variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the DB is placed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for the DB subnet group"
}

variable "client_security_group_id" {
  type        = string
  description = "Security group of ECS compute tasks allowed to connect"
}

variable "instance_class" {
  type        = string
  default     = "db.t4g.small"
  description = "RDS instance class"
}

variable "allocated_storage" {
  type        = number
  default     = 20
  description = "Allocated storage in GB"
}

variable "db_name" {
  type        = string
  default     = "taskflow"
  description = "Database name"
}

variable "db_username" {
  type        = string
  default     = "taskflow_admin"
  description = "Master database username"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "Master database password"
}

variable "backup_retention_period" {
  type        = number
  default     = 7
  description = "Automated backup retention days (PITR)"
}

variable "multi_az" {
  type        = bool
  default     = true
  description = "Enable Multi-AZ failover for high availability"
}
