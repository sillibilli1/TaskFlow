resource "aws_db_subnet_group" "main" {
  name        = "taskflow-db-subnet-group-${var.environment}"
  subnet_ids  = var.subnet_ids
  description = "Database subnet group in private subnets"

  tags = {
    Name        = "taskflow-db-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_security_group" "db" {
  name        = "taskflow-db-sg-${var.environment}"
  vpc_id      = var.vpc_id
  description = "Allow inbound PostgreSQL traffic from ECS compute tasks"

  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
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
    Name        = "taskflow-db-sg-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_db_instance" "main" {
  identifier                  = "taskflow-pg-${var.environment}"
  engine                      = "postgres"
  engine_version              = "16.3"
  instance_class              = var.instance_class
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = 100
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = var.db_name
  username                    = var.db_username
  password                    = var.db_password
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  multi_az                    = var.multi_az
  backup_retention_period     = var.backup_retention_period
  backup_window               = "03:00-04:00"
  maintenance_window          = "Sun:04:30-Sun:05:30"
  auto_minor_version_upgrade  = true
  deletion_protection         = var.environment == "production" ? true : false
  skip_final_snapshot         = var.environment == "production" ? false : true
  final_snapshot_identifier   = "taskflow-db-final-snapshot-${var.environment}"

  tags = {
    Name        = "taskflow-rds-${var.environment}"
    Environment = var.environment
  }
}
