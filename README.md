# Cloud SaaS (TaskFlow)

A production-minded, multi-tenant project-management SaaS for software teams built with NestJS, React, TypeScript, PostgreSQL, Redis, and object storage.

---

## Cloud Architecture & Delivery (Milestone 5)

TaskFlow is designed for production cloud operation with a **$0/month free-tier demonstration footprint** and a parallel **reference Infrastructure-as-Code (Terraform)** architecture for enterprise scale on AWS.

```text
                                [ Client Browser ]
                                        │
                     ┌──────────────────┴──────────────────┐
                     │                                     │
                     ▼ (Static SPA)                        ▼ (REST API /api/v1/*)
             [ taskflow-web ]                      [ taskflow-api ]
          (Render Static Site)                  (Render Web Service)
                   │                                     │
                   │                                     ├──> [ Supabase PostgreSQL ]
                   │                                     ├──> [ Upstash Redis Queue ]
                   │                                     └──> [ Supabase S3 Storage ]
                   │                                                  │
                   ▼                                                  ▼
       [ Direct Attachment Uploads ] <─────────────── (Presigned Upload URLs)
                                                                      │
                                                            [ taskflow-worker ]
                                                           (Render Web Service)
                                                                      │
                                                                      └──> [ Mailtrap SMTP ]
```

### Free-Tier Services Stack

- **Compute & Hosting**: [Render](https://render.com) (API Web Service, Worker Web Service via HTTP health server, and Web Static Site).
- **Database**: [Supabase](https://supabase.com) managed PostgreSQL with connection pooling.
- **Queue & Cache**: [Upstash](https://upstash.com) serverless Redis for BullMQ jobs and mutation rate limiting.
- **File Storage**: [Supabase Storage](https://supabase.com/storage) S3-compatible private bucket for task attachments.
- **Email Sandbox**: [Mailtrap](https://mailtrap.io) SMTP for verification, password resets, and notifications.
- **Monitoring**: [UptimeRobot](https://uptimerobot.com) external synthetic HTTP monitoring.

### Render Free-Tier Cold Starts & Keep-Alive Mitigation

> [!WARNING]
> **Free-Tier Inactivity Spin-Down (30–60s Cold Start)**:
> Render's free Web Services automatically spin down after **15 minutes of inactivity** to conserve resources.
> The first request to a spun-down service will experience a **30 to 60 second delay** while Render provisions and boots the container. Subsequent requests execute with sub-50ms latency.
>
> **Mitigation**: Configuring a free uptime monitor (such as [UptimeRobot](https://uptimerobot.com)) to ping `GET /api/v1/health` every **5 minutes** keeps the service warm during active hours, avoiding cold-start delays for end users.

---

## Operational Documentation

Detailed operational guides and runbooks are available in the [`docs/`](file:///f:/grok/project%201/docs/) directory:

- 🚀 [**Cloud Deployment Guide**](file:///f:/grok/project%201/docs/deployment.md) — Render setup via `render.yaml` Blueprint or dashboard, environment variables reference, and automatic TLS/HTTPS configuration.
- 💾 [**Database Backups & Disaster Recovery**](file:///f:/grok/project%201/docs/backups.md) — Supabase free-tier backup behavior, pause prevention, and manual `pg_dump` / `psql` procedures.
- 📈 [**Monitoring & Alerting Guide**](file:///f:/grok/project%201/docs/monitoring.md) — Render deployment zero-downtime health gates, UptimeRobot 5-minute ping setup, keep-alives, and alerting triggers.
- 🌿 [**Staging Environment & Branch Strategy**](file:///f:/grok/project%201/docs/staging.md) — Separate `staging` branch setup on Render, managing the 750 free-hour monthly pool, and promotion runbook.
- ⏪ [**Redeployment & Rollback Procedures**](file:///f:/grok/project%201/docs/rollback.md) — Instant one-click Render rollback, Git revert deployments, and database migration safety.
- 🏗️ [**Reference Infrastructure as Code (Terraform)**](file:///f:/grok/project%201/infra/README.md) — Production AWS architecture (ECS Fargate, RDS Multi-AZ, ElastiCache, S3, CloudFront, ALB, VPC).

---

## Local Development

Docker is **not required for local development**. Local development connects to hosted free-tier services:

### Prerequisites

- Node.js 22+
- npm 11+
- Supabase project credentials
- Upstash Redis credentials
- Mailtrap Sandbox credentials

### Quick Start

```powershell
Copy-Item .env.example .env
npm install
```

Configure `.env` using your credentials (see [.env.example](file:///f:/grok/project%201/.env.example)). Note that for local development, `COOKIE_SAMESITE=lax` and `COOKIE_SECURE=false` ensure authentication functions seamlessly over local HTTP (`localhost:5173`).

Run database migrations and launch the dev servers:

```powershell
npm run db:migrate
npm run dev:api
npm run dev:web
```

Start the background worker in an additional terminal:

```powershell
npm run dev:worker
```

The API is accessible at `http://localhost:3000/api/v1/health` and OpenAPI docs are available at `http://localhost:3000/api/v1/docs`.

---

## Repository Structure

- `apps/api` — NestJS REST API (`/api/v1`) with role-based access control, tenant isolation, rate limiting, and idempotency keys.
- `apps/web` — React / Vite frontend with optimistic UI updates, task board, comments, attachments, and audit feed.
- `apps/worker` — Redis-backed email and notification worker with integrated HTTP health server.
- `infra/` — Reference Terraform modules for AWS production deployment at scale.
- `docs/` — Cloud delivery runbooks (deployment, backups, monitoring, staging, rollback).
- `migrations/` — Plain SQL schema migrations with transaction-safe ledger tracking.
- `render.yaml` — Declarative Render Blueprint specification.

---

## Verification & Commands

```powershell
npm run db:migrate    # Run database schema migrations
npm run build         # Build all workspaces (TypeScript & Vite)
npm run lint          # Run TypeScript linting
npm run typecheck     # Verify type safety across workspaces
npm run test          # Run test suites (Node native test runner & tsx)
npm run format:check  # Check Prettier formatting
```
