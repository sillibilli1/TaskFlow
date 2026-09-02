variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the cache is placed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for the cache subnet group"
}

variable "client_security_group_id" {
  type        = string
  description = "Security group ID of ECS tasks allowed to connect"
}

variable "node_type" {
  type        = string
  default     = "cache.t4g.micro"
  description = "ElastiCache instance type"
}

variable "num_cache_nodes" {
  type        = number
  default     = 1
  description = "Number of cache nodes (replication group clusters)"
}
