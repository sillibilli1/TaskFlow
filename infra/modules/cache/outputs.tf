output "primary_endpoint_address" {
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  description = "Primary endpoint address for Redis writes and reads"
}

output "port" {
  value       = aws_elasticache_replication_group.main.port
  description = "Redis port"
}

output "security_group_id" {
  value       = aws_security_group.cache.id
  description = "Security group ID of the Redis cluster"
}
