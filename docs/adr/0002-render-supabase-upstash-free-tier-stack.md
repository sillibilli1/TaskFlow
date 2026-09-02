# ADR 0002: Managed Free-Tier Cloud Stack (Render + Supabase + Upstash) vs. Raw AWS Infrastructure

- **Status**: Accepted
- **Date**: 2026-08-28
- **Deciders**: Engineering Lead / Architect

---

## Context

The initial cloud-native specification proposed deploying TaskFlow onto AWS ECS Fargate, Amazon RDS PostgreSQL, Amazon ElastiCache Redis, and Application Load Balancer via Terraform.

However, operating dedicated production AWS resources incurs baseline fixed costs of **~$177/month** ($55/mo ALB/NAT, $58/mo RDS Multi-AZ, $30/mo ECS Fargate, $13/mo Redis, $3/mo S3/CloudFront) regardless of traffic volume. For an open-source demonstration and portfolio SaaS, this represents unnecessary financial overhead.

We needed an infrastructure strategy that:

1. Achieves a **$0.00/month continuous operational cost**.
2. Preserves cloud-native architecture principles (decoupled compute, managed relational DB, Redis caching/queuing, object storage, auto-deploy CI/CD).
3. Provides an enterprise-grade migration path to AWS when traffic scales.

---

## Decision

We chose to deploy the live application on a **hybrid managed free-tier cloud stack** while maintaining a complete, parallel **reference Terraform configuration** in [`infra/`](file:///f:/grok/project%201/infra/) for AWS enterprise scale.

### Live Stack Components:

1. **Render**:
   - Web Frontend: Render Static Site (100% free, automated TLS, global edge CDN).
   - REST API: Render Web Service (750 free instance-hours/month, zero-downtime health gates).
   - Worker: Render Web Service running an HTTP health server on `PORT` to qualify for free-tier web hosting.
2. **Supabase**:
   - Managed PostgreSQL 16 with connection pooling, SSL encryption, and 500MB storage.
   - S3-compatible private object storage for file attachments (1GB free).
3. **Upstash**:
   - Serverless Redis 7.0 with TLS (`rediss://`) supporting 10,000 commands/day free.
4. **Mailtrap**:
   - Sandbox SMTP for isolated verification and invitation email testing without sending real spam.

---

## Alternatives Considered

### Direct AWS Deployment via Terraform

- **Pros**: Complete control over VPC networking, IAM boundaries, subnets, and ECS task autoscaling.
- **Cons**:
  - High monthly fixed cost (~$177/mo) even at zero traffic.
  - NAT Gateways and ALB hourly costs cannot be avoided in high-availability VPC setups.
  - High operational complexity for a portfolio demonstration.

### Single-VM VPS (e.g. Hetzner / DigitalOcean $5 Droplet)

- **Pros**: Low fixed cost ($5–$10/mo).
- **Cons**:
  - Violates cloud-native decoupling: PostgreSQL, Redis, Worker, and API share single-host CPU, memory, and disk.
  - No managed automated failover, no managed point-in-time recovery, and manual TLS/Let's Encrypt renewal maintenance.

---

## Consequences

- **Positive**:
  - **$0.00/month infrastructure cost** indefinitely.
  - Fully automated continuous deployment on push to `main`.
  - Production-grade security with automated TLS certificates managed by Render edge routers.
  - Preserves clean architecture: Application code is completely agnostic to whether PostgreSQL is hosted on Supabase or Amazon RDS.
- **Negative**:
  - **Render Cold Starts**: Free Web Services spin down after 15 minutes of inactivity, causing a 30–60 second delay on initial wake-up (mitigated via UptimeRobot 5-minute keep-alive pings).
  - **Supabase Free Inactivity Pausing**: Supabase projects pause after 7 days without queries (mitigated via keep-alive queries on `/api/v1/ready`).
