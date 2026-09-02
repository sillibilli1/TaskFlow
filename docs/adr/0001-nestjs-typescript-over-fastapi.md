# ADR 0001: Selection of NestJS and TypeScript over Python FastAPI

- **Status**: Accepted
- **Date**: 2026-08-25
- **Deciders**: Engineering Lead / Architect

---

## Context

TaskFlow requires a high-performance, maintainable REST backend with multi-tenant workspace isolation, role-based access control, OpenAPI documentation, asynchronous background jobs, and robust request validation. The initial architecture specification allowed choosing between **Node.js (NestJS)** and **Python (FastAPI)**.

Key criteria for the decision:

1. Monorepo cohesion and cross-tier type sharing with the React frontend.
2. Architectural discipline and maintainability as the service grows.
3. Ecosystem support for authentication, database pooling, and rate limiting.
4. Cold-start latency and runtime performance in containerized / serverless environments.

---

## Decision

We chose **NestJS with TypeScript** as the backend framework for TaskFlow.

1. **Unified Language & Type Sharing**: Using TypeScript across both `apps/api` and `apps/web` allows sharing types, DTO contracts, and validation rules directly across the monorepo boundary without code generators.
2. **Modular Architecture & Dependency Injection**: NestJS enforces an enterprise-grade modular architecture (Controllers, Services, Modules, Guards, Interceptors) with a built-in IoC container. This prevents code spaghetti and simplifies unit testing with mock services.
3. **Integrated Pipe & Guard Pipeline**:
   - `ValidationPipe` with `class-validator` provides automatic runtime request validation and sanitization.
   - `AuthGuard`, `WorkspaceGuard`, and `RoleGuard` execute declaratively in a clean lifecycle pipeline.
   - Interceptors (`RateLimitInterceptor`, `IdempotencyInterceptor`) provide composable cross-cutting request handling.
4. **First-Class OpenAPI / Swagger Integration**: With `@nestjs/swagger`, API documentation is derived directly from TypeScript classes and DTO decorators without maintaining external YAML files.

---

## Alternatives Considered

### Python FastAPI

- **Pros**: Fast development cycle, automatic Pydantic validation, great async I/O performance with `asyncio` and `uvicorn`.
- **Cons**:
  - Dual-language stack: Developers must switch between Python (backend) and TypeScript/JavaScript (frontend), duplicating type definitions.
  - Dependency management: Managing `poetry`/`pipenv` alongside `npm` workspaces adds CI complexity.
  - Absence of an opinionated architecture: FastAPI leaves file organization, dependency injection, and layering up to each engineer, often leading to inconsistent project structure across large codebases.

---

## Consequences

- **Positive**:
  - Full monorepo type safety from database query results to API responses to React state.
  - Single package manager (`npm` workspaces) and single CI toolchain for linting, typechecking, and testing.
  - Highly readable, self-documenting code with NestJS decorators and Swagger annotations.
- **Negative**:
  - NestJS introduces decorators, metadata reflection, and a higher conceptual learning curve compared to lightweight Express or FastAPI scripts.
  - TypeScript compilation step (`tsc`) is required before deployment.
