# Project 1: Cloud-Native SaaS Platform

## Portfolio headline

**Deployable multi-tenant project-management SaaS with production-grade cloud infrastructure.**

This project demonstrates that you can build and operate a real web product, not only a local CRUD application. The target user is a small software team that needs workspaces, projects, tasks, comments, file attachments, and activity history.

## Why this project belongs in the portfolio

It gives you evidence of backend engineering, API design, database modeling, authentication, cloud deployment, observability, testing, security, and cost awareness. Keep the first version intentionally small but make the engineering quality visible.

## Recommended stack

- Frontend: React with TypeScript and a component library.
- Backend: Python FastAPI or Node.js with NestJS. Choose one and go deep.
- Database: PostgreSQL with migrations.
- Cache and background jobs: Redis and a worker process.
- Object storage: S3-compatible storage for attachments.
- Local development: Docker Compose.
- Deployment: Docker images on AWS ECS Fargate, Google Cloud Run, or Azure Container Apps. Select one cloud provider.
- Infrastructure as code: Terraform.
- CI/CD: GitHub Actions.
- Observability: OpenTelemetry, structured logs, metrics, and an error tracker.

## Product scope

### MVP features

1. User registration, login, logout, password reset, and email verification.
2. Workspace creation and membership invitations.
3. Roles: owner, admin, member, and read-only viewer.
4. Projects, tasks, labels, due dates, priorities, and status transitions.
5. Comments and an immutable activity feed.
6. Search, filtering, and pagination.
7. File attachment upload using pre-signed object-storage URLs.
8. Workspace-level audit log.
9. Responsive dashboard with useful empty, loading, and error states.

### Differentiating features

- Tenant isolation tests that prove one workspace cannot access another workspace's data.
- Optimistic UI updates with safe rollback.
- Rate limiting and idempotency keys for mutating API requests.
- Export workspace data as JSON or CSV.
- A public status page for the deployed service.

## Architecture

```text
Browser
  |
  v
CDN / HTTPS Load Balancer
  |
  +--> Frontend container or static hosting
  |
  +--> API service --------------------> PostgreSQL
  |          |                           Redis
  |          |                           Object storage
  |          v
  |       Job queue ---> Worker --------> Email provider
  |
  +--> OpenTelemetry collector ---> Logs, metrics, traces, alerts
```

## Suggested repository structure

```text
cloud-saas/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── shared-types/
│   └── config/
├── infra/
│   ├── modules/
│   └── environments/
├── migrations/
├── docs/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## Core data model

- `users`: identity and profile data.
- `workspaces`: tenant boundary.
- `workspace_members`: user-to-workspace relationship and role.
- `projects`: workspace-owned project records.
- `tasks`: project-owned work items.
- `comments`: task discussion.
- `attachments`: metadata and object-storage key.
- `activity_events`: append-only audit history.
- `refresh_tokens`: hashed, revocable sessions.

Every tenant-owned table should have a `workspace_id` or an enforceable relationship to one. Add database indexes for workspace filtering, task status, due dates, and activity timestamps.

## API design

Use versioned REST endpoints such as:

- `POST /api/v1/auth/login`
- `GET /api/v1/workspaces/{workspace_id}/projects`
- `POST /api/v1/projects/{project_id}/tasks`
- `PATCH /api/v1/tasks/{task_id}`
- `POST /api/v1/tasks/{task_id}/attachments/presign`
- `GET /api/v1/workspaces/{workspace_id}/audit-events`

Define an OpenAPI contract, consistent error responses, request validation, pagination conventions, and authorization checks at the service boundary.

## Security requirements

- Hash passwords with Argon2id or an equivalent modern password hash.
- Store refresh tokens hashed and rotate them on use.
- Use secure, HttpOnly cookies where appropriate.
- Validate upload size, MIME type, and file extension.
- Never trust a client-provided `workspace_id` without checking membership.
- Keep secrets in the cloud secret manager, never in the repository.
- Add dependency scanning, secret scanning, and container vulnerability scanning to CI.
- Document a threat model covering broken access control, injection, SSRF, and insecure file uploads.

## Delivery milestones

### Milestone 1: Foundation

Set up the monorepo, local containers, formatting, linting, type checking, migrations, health endpoints, and a minimal CI pipeline.

### Milestone 2: Identity and tenancy

Implement authentication, workspace membership, role authorization, tenant isolation, and integration tests.

### Milestone 3: Product workflow

Implement projects, tasks, comments, search, pagination, and the frontend dashboard.

### Milestone 4: Production features

Add attachments, background jobs, notifications, audit events, rate limiting, and idempotency.

### Milestone 5: Cloud delivery

Provision infrastructure with Terraform, deploy with GitHub Actions, configure TLS, backups, monitoring, alerts, and a staging environment.

### Milestone 6: Portfolio polish

Add an architecture diagram, ADRs, API documentation, demo video, load-test results, cost estimate, and a postmortem for one intentionally injected failure.

## Definition of done

- A reviewer can create an account and use a hosted demo.
- CI runs tests, linting, type checks, security checks, and image building.
- Staging and production configuration are separated.
- Database backups and rollback procedures are documented.
- A load test reports throughput, latency percentiles, and resource limits.
- The README explains trade-offs rather than only listing technologies.

## What to learn while building

- Complete a Coursera course or specialization on cloud architecture, Docker/Kubernetes fundamentals, PostgreSQL, and secure web application development.
- Read the official documentation for the cloud provider you choose, Terraform, FastAPI or NestJS, PostgreSQL, and OpenTelemetry.
- Practice explaining tenancy, horizontal scaling, database indexing, deployment rollback, and cloud cost controls in mock interviews.
- Use Claude as a reviewer for API contracts, test cases, threat-model gaps, and documentation; verify every suggestion against official documentation and run the code yourself.
