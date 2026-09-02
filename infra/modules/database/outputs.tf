output "endpoint" {
  value       = aws_db_instance.main.endpoint
  description = "Connection endpoint of the PostgreSQL RDS instance"
}

output "address" {
  value       = aws_db_instance.main.address
  description = "Host address of the PostgreSQL RDS instance"
}

output "port" {
  value       = aws_db_instance.main.port
  description = "Port of the PostgreSQL RDS instance"
}

output "db_name" {
  value       = aws_db_instance.main.db_name
  description = "Database name"
}

output "security_group_id" {
  value       = aws_security_group.db.id
  description = "Security group ID of the database"
}
