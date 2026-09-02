terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # For actual AWS deployment, state should be stored in an S3 backend with DynamoDB locking:
  # backend "s3" {
  #   bucket         = "taskflow-terraform-state"
  #   key            = "environments/production/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "taskflow-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TaskFlow"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. Networking Module (VPC, Subnets, NAT, IGW)
module "networking" {
  source             = "./modules/networking"
  environment        = var.environment
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# 2. Compute Module (ECS Fargate, ALB, Task Definitions)
module "compute" {
  source             = "./modules/compute"
  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  private_subnet_ids = module.networking.private_subnet_ids
  api_image          = var.api_image
  worker_image       = var.worker_image
  certificate_arn    = var.certificate_arn
}

# 3. Database Module (Amazon RDS PostgreSQL)
module "database" {
  source                   = "./modules/database"
  environment              = var.environment
  vpc_id                   = module.networking.vpc_id
  subnet_ids               = module.networking.private_subnet_ids
  client_security_group_id = module.compute.ecs_tasks_security_group_id
  instance_class           = var.db_instance_class
  db_name                  = var.db_name
  db_username              = var.db_username
  db_password              = var.db_password
}

# 4. Cache Module (Amazon ElastiCache Redis)
module "cache" {
  source                   = "./modules/cache"
  environment              = var.environment
  vpc_id                   = module.networking.vpc_id
  subnet_ids               = module.networking.private_subnet_ids
  client_security_group_id = module.compute.ecs_tasks_security_group_id
  node_type                = var.redis_node_type
}

# 5. Storage Module (Amazon S3 Attachments Bucket)
module "storage" {
  source               = "./modules/storage"
  environment          = var.environment
  cors_allowed_origins = ["*"]
}
