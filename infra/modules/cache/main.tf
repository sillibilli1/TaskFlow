resource "aws_elasticache_subnet_group" "main" {
  name       = "taskflow-cache-subnet-group-${var.environment}"
  subnet_ids = var.subnet_ids

  tags = {
    Name        = "taskflow-cache-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_security_group" "cache" {
  name        = "taskflow-cache-sg-${var.environment}"
  vpc_id      = var.vpc_id
  description = "Allow inbound Redis traffic from ECS compute tasks"

  ingress {
    description     = "Redis from ECS tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.client_security_group_id]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name        = "taskflow-cache-sg-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_elasticache_parameter_group" "main" {
  name   = "taskflow-redis-params-${var.environment}"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "noeviction"
  }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "taskflow-redis-${var.environment}"
  description                = "TaskFlow Redis cache and job queue"
  node_type                  = var.node_type
  num_cache_clusters         = var.num_cache_nodes
  parameter_group_name       = aws_elasticache_parameter_group.main.name
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.cache.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = var.num_cache_nodes > 1 ? true : false

  tags = {
    Name        = "taskflow-redis-${var.environment}"
    Environment = var.environment
  }
}
