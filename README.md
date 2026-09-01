# Cloud SaaS

A production-minded, multi-tenant project-management SaaS for small software teams.

## Local development with free-tier services

Docker is **not required for local development**. Local development uses hosted free-tier services:

- **Supabase Postgres** for the database.
- **Upstash Redis** for Redis-compatible cache and queue connectivity.
- **Mailtrap Sandbox SMTP** for verification, password-reset, and invitation email testing.

### Prerequisites

- Node.js 22+
- npm 11+
- A Supabase project
- An Upstash Redis database
- A Mailtrap Sandbox

### Quick start

```powershell
Copy-Item .env.example .env
npm install
```

Fill in `.env` using the comments in `.env.example`:

- Get `DATABASE_URL` from the Supabase dashboard.
- Get `REDIS_URL` from the Upstash dashboard.
- Get `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` from the Mailtrap dashboard.
- Generate a long random `SESSION_SECRET`; never commit `.env`.

Then run migrations and start the development servers:

```powershell
npm run db:migrate
npm run dev --workspace=@cloud-saas/api
npm run dev --workspace=@cloud-saas/web
```

The API is available at `http://localhost:3000/api/v1/health` and its OpenAPI documentation is at `http://localhost:3000/api/v1/docs`. Mailtrap displays captured sandbox emails in its dashboard; no local SMTP container is needed.

The repository still includes `docker-compose.yml` and the Dockerfiles for CI and the later Render deployment path. They are not part of the normal local development workflow.

## Workspace layout

- `apps/api` — NestJS REST API
- `apps/web` — React/Vite frontend
- `apps/worker` — background worker process shell
- `packages` — shared packages added when boundaries are established
- `infra` — later infrastructure documentation and Terraform reference
- `tests` — integration and end-to-end test locations

## Commands

```powershell
npm run db:migrate
npm run build
npm run lint
npm run typecheck
npm run test
npm run format:check
```

The API uses `/api/v1` versioning, strict request validation, cursor-based pagination, and Swagger/OpenAPI documentation. Phase 2 includes identity and tenancy; Phase 3 will add the core product workflow.
