# TaskFlow API Documentation

TaskFlow provides a versioned REST API adhering to OpenAPI 3.0 standards, JSON schemas, strict request validation, and tenant-isolated boundaries.

- **Live Interactive Swagger UI**: [https://taskflow-api-u96m.onrender.com/api/v1/docs](https://taskflow-api-u96m.onrender.com/api/v1/docs)
- **Base Production URL**: `https://taskflow-api-u96m.onrender.com/api/v1`
- **Base Staging URL**: `https://taskflow-api-staging-3lou.onrender.com/api/v1`

---

## 1. Request & Response Conventions

### Headers

| Header            | Description                                       | Required                               |
| :---------------- | :------------------------------------------------ | :------------------------------------- |
| `Content-Type`    | `application/json`                                | Yes (for POST/PATCH)                   |
| `Idempotency-Key` | UUIDv4 string preventing duplicate mutations      | Optional (auto-injected by web client) |
| `Cookie`          | Session cookies (`access_token`, `refresh_token`) | Yes (for protected endpoints)          |

### Standard Error Schema

All error responses return a standardized JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "email must be an email"
      }
    ],
    "path": "/api/v1/auth/login",
    "timestamp": "2026-09-03T02:00:00.000Z"
  }
}
```

---

## 2. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`

Creates a new user and enqueues a verification email job.

- **Request**:
  ```json
  {
    "email": "teammate@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "User registered. Please check your email to verify."
  }
  ```

### `POST /api/v1/auth/login`

Validates credentials and issues `access_token` (15m) and `refresh_token` (30d) cookies.

- **Request**:
  ```json
  {
    "email": "teammate@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "c30164b1-e224-4f49-923f-e5fa276e01a4",
      "email": "teammate@example.com"
    }
  }
  ```

### `POST /api/v1/auth/refresh`

Rotates the refresh token and issues a new access token.

- **Response (200 OK)**: `{"user": {"id": "...", "email": "..."}}`

### `POST /api/v1/auth/logout`

Revokes the refresh token in PostgreSQL and clears cookies.

- **Response (200 OK)**: `{"loggedOut": true}`

### `GET /api/v1/auth/me`

Returns the currently authenticated user session.

- **Response (200 OK)**: `{"id": "...", "email": "..."}`

---

## 3. Workspaces (`/api/v1/workspaces`)

### `GET /api/v1/workspaces`

Lists all workspaces where the current user is an active member.

- **Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "w_12345",
        "name": "Acme Engineering",
        "role": "owner"
      }
    ]
  }
  ```

### `POST /api/v1/workspaces`

Creates a new workspace and assigns the creator as `owner`.

- **Request**: `{"name": "Alpha Team"}`
- **Response (201 Created)**: `{"id": "w_67890", "name": "Alpha Team", "role": "owner"}`

### `POST /api/v1/workspaces/:workspaceId/invitations`

Invites a user by email with a designated role (`admin`, `member`, `viewer`).

- **Request**:
  ```json
  {
    "email": "newdev@example.com",
    "role": "member"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "invitation": {
      "id": "inv_123",
      "email": "newdev@example.com",
      "role": "member",
      "expires_at": "2026-09-10T00:00:00.000Z"
    }
  }
  ```

### `POST /api/v1/workspaces/invitations/accept`

Accepts an invitation token.

- **Request**: `{"token": "raw-hex-token-from-email"}`
- **Response (200 OK)**: `{"workspaceId": "w_12345"}`

---

## 4. Projects & Tasks (`/api/v1/workspaces/:workspaceId/projects`)

### `GET /api/v1/workspaces/:workspaceId/projects`

Lists projects in the specified workspace.

- **Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "p_101",
        "name": "Mobile Redesign",
        "description": "iOS and Android refresh",
        "created_at": "2026-09-01T12:00:00.000Z"
      }
    ]
  }
  ```

### `POST /api/v1/workspaces/:workspaceId/projects`

Creates a new project.

- **Request**: `{"name": "Backend API", "description": "Core endpoints"}`
- **Response (201 Created)**: `{"id": "p_102", "name": "Backend API", ...}`

### `GET /api/v1/workspaces/:workspaceId/projects/:projectId/tasks`

Fetches tasks with cursor-based pagination and status filtering.

- **Query Params**:
  - `status`: `todo` | `in_progress` | `done` (optional)
  - `limit`: `number` (default: 20, max: 100)
  - `cursor`: base64 cursor string (optional)
- **Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "t_501",
        "title": "Build auth flow",
        "status": "in_progress",
        "priority": "high",
        "due_date": "2026-09-15T00:00:00.000Z",
        "created_at": "2026-09-02T10:00:00.000Z"
      }
    ],
    "next_cursor": "ZXlKaGJHY2lPaUpJVXpV..."
  }
  ```

### `POST /api/v1/workspaces/:workspaceId/projects/:projectId/tasks`

Creates a new task and emits an activity event.

- **Request**:
  ```json
  {
    "title": "Set up CDN caching",
    "description": "Cache headers for static assets",
    "priority": "medium",
    "due_date": "2026-09-20"
  }
  ```
- **Response (201 Created)**: `{"id": "t_502", "title": "Set up CDN caching", ...}`

### `PATCH /api/v1/workspaces/:workspaceId/tasks/:taskId`

Updates task fields (status, priority, due date, assignee).

- **Request**: `{"status": "done"}`
- **Response (200 OK)**: `{"id": "t_502", "status": "done", ...}`

---

## 5. Attachments (`/tasks/:taskId/attachments`)

### `POST .../attachments/presign`

Requests a pre-signed S3 upload URL.

- **Request**:
  ```json
  {
    "filename": "design-spec.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 2048576
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "signedUrl": "https://ciehcvltlpjmjettvprn.supabase.co/storage/v1/object/upload/sign/attachments/...",
    "storageKey": "w_123/t_502/uuid-design-spec.pdf"
  }
  ```

### `POST .../attachments/complete`

Registers the uploaded file metadata in the database.

- **Request**:
  ```json
  {
    "filename": "design-spec.pdf",
    "storageKey": "w_123/t_502/uuid-design-spec.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 2048576
  }
  ```
- **Response (201 Created)**: `{"id": "att_901", "filename": "design-spec.pdf", ...}`

### `GET .../attachments/:attachmentId/download`

Returns a short-lived (60-second) pre-signed download URL.

- **Response (200 OK)**:
  ```json
  {
    "downloadUrl": "https://ciehcvltlpjmjettvprn.supabase.co/storage/v1/object/sign/attachments/...?token=..."
  }
  ```

---

## 6. Diagnostics & Health

### `GET /api/v1/health`

Lightweight process liveness check.

- **Response (200 OK)**: `{"status": "ok"}`

### `GET /api/v1/ready`

Deep dependency readiness check (validates PostgreSQL `SELECT 1` and Redis `PING`).

- **Response (200 OK)**:
  ```json
  {
    "status": "ready",
    "dependencies": {
      "postgres": "up",
      "redis": "up"
    }
  }
  ```
