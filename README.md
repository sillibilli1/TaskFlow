# Cloud SaaS

A production-minded, multi-tenant project-management SaaS for small software teams.

## Phase 1 foundation

This repository is a TypeScript monorepo with NestJS API, React/Vite web app, worker process, PostgreSQL, Redis, and Mailpit local email capture.

### Prerequisites

- Node.js 22+
- npm 11+
- Docker Desktop (required for PostgreSQL, Redis, and Mailpit)

### Quick start

```powershell
Copy-Item .env.example .env
npm install
npm run build
npm run dev
```

Start local dependencies with:

```powershell
docker compose up -d
```

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Mailpit UI: http://localhost:8025
- API: http://localhost:3000/api/v1/health
- API documentation: http://localhost:3000/api/v1/docs

Docker Compose setup is written but not yet locally verified — please run `docker compose up` in an environment with Docker installed before relying on it, and report any issues.

The Compose file has been manually checked for valid YAML, service definitions, port mappings, volume mounts, health checks, and PostgreSQL environment variables. GitHub Actions now validates the Compose configuration and builds the API, web, and worker images on every push and pull request. Local runtime verification remains outstanding until Docker Desktop is available.

## Workspace layout

- `apps/api` — NestJS REST API
- `apps/web` — React/Vite frontend
- `apps/worker` — background worker process shell
- `packages` — shared packages added when boundaries are established
- `infra` — later infrastructure documentation and Terraform reference
- `tests` — integration and end-to-end test locations

## Commands

```powershell
npm run build
npm run lint
npm run typecheck
npm run test
npm run format:check
```

The API uses `/api/v1` versioning, strict request validation, and Swagger/OpenAPI documentation. Phase 2 will add identity and tenancy; Phase 3 will add the core product workflow.
