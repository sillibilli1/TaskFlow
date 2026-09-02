output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the Application Load Balancer"
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "Canonical-hosted zone ID of the load balancer"
}

output "ecs_tasks_security_group_id" {
  value       = aws_security_group.ecs_tasks.id
  description = "Security group ID of ECS tasks (used to authorize DB and cache ingress)"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "Name of the ECS cluster"
}
