# Reference Infrastructure as Code (AWS Production Scale)

> [!IMPORTANT]
> **REFERENCE INFRASTRUCTURE ONLY — NOT DEPLOYED FOR THE $0/MONTH FREE-TIER VERSION**
>
> The live deployment of TaskFlow runs on **free-tier managed cloud platforms** (Render for Web & Worker services + Static Site, Supabase for PostgreSQL & Storage, Upstash for Redis, and Mailtrap for SMTP) to achieve **$0/month infrastructure cost**.
>
> This directory contains the complete, production-grade **Terraform** specification for AWS that represents the architecture originally planned at scale. It demonstrates how TaskFlow transitions from free-tier SaaS to enterprise-grade cloud infrastructure without changing core application architecture.

---

## 1. High-Level AWS Architecture

```text
                                 [ User Requests (Browser / Mobile) ]
                                                  │
                                                  ▼
                                     [ AWS Route 53 DNS + ACM TLS ]
                                                  │
                                                  ▼
                               [ AWS Application Load Balancer (ALB) ]
                                          │               │
                               (HTTP -> HTTPS Redirect)  (Path /api/v1/*)
                                                          │
                         ┌────────────────────────────────┴────────────────────────────────┐
                         │                     AWS VPC (10.0.0.0/16)                       │
                         │                                                                 │
                         │  [ Public Subnets ]                                             │
                         │  ├── ALB Ingress (80/443)                                       │
                         │  └── NAT Gateway (Outbound egress for private tasks)            │
                         │                                                                 │
                         │  [ Private Subnets ]                                            │
                         │  ├── ECS Fargate Cluster                                        │
                         │  │   ├── taskflow-api (Port 3000, autoscale 2-10 tasks)         │
                         │  │   └── taskflow-worker (Job consumer, autoscale 1-5 tasks)    │
                         │  │                                                              │
                         │  ├── Amazon RDS PostgreSQL (Port 5432)                          │
                         │  │   └── Multi-AZ, automated backups, KMS encrypted             │
                         │  │                                                              │
                         │  └── Amazon ElastiCache Redis (Port 6379)                       │
                         │      └── In-transit encryption, auth enabled                    │
                         │                                                                 │
                         │  [ Object Storage ]                                             │
                         │  └── Amazon S3 (Task attachments, CORS, SSE-S3)                 │
                         │                                                                 │
                         │  [ Observability ]                                              │
                         │  └── CloudWatch Container Insights & Alarms                     │
                         └─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Modules

| Module                   | Resource Types                                                        | Description                                                                                                                      |
| :----------------------- | :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **`modules/networking`** | `aws_vpc`, `aws_subnet`, `aws_nat_gateway`, `aws_route_table`         | Isolated VPC across 2 Availability Zones with distinct public and private subnets, NAT Gateway for outbound egress.              |
| **`modules/compute`**    | `aws_ecs_cluster`, `aws_ecs_service`, `aws_lb`, `aws_lb_target_group` | Serverless container execution with AWS ECS Fargate, ALB health checking (`/api/v1/health`), and HTTPS listeners.                |
| **`modules/database`**   | `aws_db_instance`, `aws_db_subnet_group`, `aws_security_group`        | PostgreSQL 16 on Amazon RDS with Multi-AZ redundancy, 7-day automated backups (point-in-time recovery), and storage autoscaling. |
| **`modules/cache`**      | `aws_elasticache_replication_group`, `aws_elasticache_subnet_group`   | In-memory Redis replication group for session cache, job queues, and mutation rate limiting.                                     |
| **`modules/storage`**    | `aws_s3_bucket`, `aws_s3_bucket_cors_configuration`                   | Private S3 bucket for task file attachments with strict public access blocks and pre-signed URL upload/download support.         |

---

## 3. Cost Analysis: AWS Scale vs. Live Free Tier

| Capability               | Reference AWS Production Scale             | Live Free-Tier Setup (Current)        |
| :----------------------- | :----------------------------------------- | :------------------------------------ |
| **Compute / API**        | AWS ECS Fargate (2 tasks): ~$30/mo         | Render Web Service (Free Tier): $0    |
| **Background Worker**    | AWS ECS Fargate (1 task): ~$15/mo          | Render Web Service (HTTP health): $0  |
| **Frontend Web**         | CloudFront + S3: ~$2/mo                    | Render Static Site: $0                |
| **Load Balancer & NAT**  | ALB + 1 NAT Gateway: ~$55/mo               | Render Edge Routers / Cloudflare: $0  |
| **Database**             | Amazon RDS db.t4g.small Multi-AZ: ~$58/mo  | Supabase Managed Postgres (500MB): $0 |
| **Cache & Queue**        | ElastiCache Redis cache.t4g.micro: ~$13/mo | Upstash Redis (10k cmd/day): $0       |
| **Object Storage**       | Amazon S3 + Data Transfer: ~$3/mo          | Supabase Storage (1GB): $0            |
| **Email SMTP**           | Amazon SES: ~$1/mo                         | Mailtrap Sandbox (Testing): $0        |
| **Total Estimated Cost** | **~$177 / month**                          | **$0.00 / month**                     |

---

## 4. How to Apply (If Migrating to AWS)

### Prerequisites

- AWS CLI v2 configured with IAM credentials.
- Terraform v1.5+ installed.
- ECR or GitHub Container Registry with pre-built Docker images (`cloud-saas-api`, `cloud-saas-worker`).

### Deployment Steps

```bash
# 1. Switch to infra directory
cd infra

# 2. Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with database passwords and ACM certificate ARN

# 3. Initialize Terraform plugins
terraform init

# 4. Review the execution plan
terraform plan -out=tfplan

# 5. Apply the infrastructure
terraform apply tfplan
```

### Safety Rules

- **State Storage**: Never commit `terraform.tfstate` or `terraform.tfvars`. Use an S3 backend with DynamoDB state locking.
- **Secrets Management**: In production, inject secrets via AWS Secrets Manager or AWS Systems Manager Parameter Store rather than plain text tfvars.
- **Teardown**: To avoid unexpected cloud charges when testing reference infrastructure, run `terraform destroy`.
