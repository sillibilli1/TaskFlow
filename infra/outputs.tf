output "alb_dns_name" {
  value       = module.compute.alb_dns_name
  description = "Public DNS name of the Application Load Balancer"
}

output "rds_endpoint" {
  value       = module.database.endpoint
  description = "Connection endpoint of the PostgreSQL RDS instance"
}

output "redis_endpoint" {
  value       = module.cache.primary_endpoint_address
  description = "Primary endpoint address of the ElastiCache Redis cluster"
}

output "s3_attachments_bucket" {
  value       = module.storage.bucket_id
  description = "Name of the S3 bucket created for task file attachments"
}

output "ecs_cluster_name" {
  value       = module.compute.ecs_cluster_name
  description = "Name of the ECS Fargate cluster"
}
