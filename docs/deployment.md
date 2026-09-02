# Cloud Deployment Guide (Render & Free-Tier Services)

This guide covers the deployment of TaskFlow to **Render** connected with **Supabase** (PostgreSQL & Storage), **Upstash** (Redis), and **Mailtrap** (SMTP).

---

## 1. Cloud Architecture Overview

TaskFlow is decoupled into three cloud-managed components on Render:

1. **`taskflow-api`** (Web Service): NestJS REST API exposing `/api/v1` routes with database connection pooling, Redis rate limiting, session auth, and `/api/v1/health` probes.
2. **`taskflow-worker`** (Web Service): Background job consumer processing email dispatches and notification events from Upstash Redis queues. Configured as a Web Service on Render's free tier with an integrated lightweight HTTP health server (`/`) to meet free-tier hosting requirements.
3. **`taskflow-web`** (Static Site): React Vite Single Page Application served globally over Render's CDN edge with instant cache invalidation and client-side route rewrites.

```text
                                [ User Browser ]
                                       │
                     ┌─────────────────┴─────────────────┐
                     │                                   │
                     ▼ (Static Assets)                   ▼ (REST Requests: /api/v1/*)
           [ taskflow-web ]                    [ taskflow-api ]
        (Render Static Site)                (Render Web Service)
                 │                                   │
                 │                                   ├──> [ Supabase PostgreSQL ]
                 │                                   ├──> [ Upstash Redis Queue ]
                 │                                   └──> [ Supabase S3 Storage ]
                 │                                                │
                 ▼                                                ▼
     [ User Browser Direct Uploads ] <─────────────── (Presigned Upload URLs)
                                                                  │
                                                        [ taskflow-worker ]
                                                       (Render Web Service)
                                                                  │
                                                                  └──> [ Mailtrap SMTP ]
```

---

## 2. TLS & HTTPS Security

- **Automatic TLS/SSL Certificates**: Render automatically provisions and renews free Let's Encrypt SSL/TLS certificates for all services on `*.onrender.com` domains and custom domains.
- **Forced HTTPS**: All HTTP traffic is automatically upgraded to HTTPS via 301 redirects at Render's edge proxies.
- **Cross-Origin Authentication Security**:
  - In production (`APP_ENV=production`), authentication session cookies are issued with `SameSite=None; Secure; HttpOnly; Path=/`.
  - This allows cross-origin requests between the static frontend (`https://<web-slug>.onrender.com`) and the API backend (`https://<api-slug>.onrender.com`) while safeguarding tokens from client-side script inspection (XSS defense).
  - In local development (`APP_ENV=development`), cookies automatically default to `SameSite=Lax; Secure=false` so local HTTP testing remains straightforward.

---

## 3. Render Free-Tier Characteristics & Cold-Start Delay

> [!WARNING]
> **Free-Tier Inactivity Spin-Down**:
> Render's free Web Services automatically spin down after **15 minutes of inactivity**.
> When a new HTTP request arrives at a spun-down service, Render spins it up, introducing a **30 to 60 second cold-start delay** on the first request.
> Subsequent requests respond instantly with normal sub-50ms latency.
>
> **Mitigation**: UptimeRobot's free 5-minute uptime monitor sends periodic HTTP `GET /api/v1/health` requests, which keeps the API warm and prevents it from entering sleep mode during active hours (see [Monitoring Guide](file:///f:/grok/project%201/docs/monitoring.md)).

---

## 4. Environment Variables Reference

### API Web Service (`taskflow-api`)

| Variable                    | Required | Value / Description                                       |
| :-------------------------- | :------- | :-------------------------------------------------------- |
| `NODE_ENV`                  | Yes      | `production`                                              |
| `APP_ENV`                   | Yes      | `production`                                              |
| `PORT`                      | Yes      | `10000` (automatically set by Render)                     |
| `DATABASE_URL`              | Yes      | Supabase PostgreSQL URI (from Supabase Database settings) |
| `DATABASE_SSL`              | Yes      | `true`                                                    |
| `REDIS_URL`                 | Yes      | Upstash Redis connection URI (`rediss://...`)             |
| `SESSION_SECRET`            | Yes      | High-entropy random string (at least 32 characters)       |
| `CORS_ORIGINS`              | Yes      | `https://<taskflow-web-slug>.onrender.com`                |
| `COOKIE_SAMESITE`           | Yes      | `none`                                                    |
| `COOKIE_SECURE`             | Yes      | `true`                                                    |
| `SUPABASE_URL`              | Yes      | `https://<project-ref>.supabase.co`                       |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Supabase Service Role Secret                              |
| `SUPABASE_STORAGE_BUCKET`   | Yes      | `attachments`                                             |
| `SMTP_HOST`                 | Yes      | `sandbox.smtp.mailtrap.io`                                |
| `SMTP_PORT`                 | Yes      | `2525`                                                    |
| `SMTP_USER`                 | Yes      | Mailtrap API / SMTP username                              |
| `SMTP_PASSWORD`             | Yes      | Mailtrap API / SMTP password                              |
| `SMTP_SECURE`               | Yes      | `false`                                                   |
| `EMAIL_FROM`                | Yes      | `TaskFlow <no-reply@taskflow.dev>`                        |
| `RATE_LIMIT_MUTATION`       | Yes      | `60`                                                      |
| `RATE_LIMIT_WINDOW_SEC`     | Yes      | `60`                                                      |

### Worker Web Service (`taskflow-worker`)

| Variable        | Required | Value / Description                   |
| :-------------- | :------- | :------------------------------------ |
| `NODE_ENV`      | Yes      | `production`                          |
| `APP_ENV`       | Yes      | `production`                          |
| `PORT`          | Yes      | `10000` (automatically set by Render) |
| `REDIS_URL`     | Yes      | Upstash Redis connection URI          |
| `SMTP_HOST`     | Yes      | `sandbox.smtp.mailtrap.io`            |
| `SMTP_PORT`     | Yes      | `2525`                                |
| `SMTP_USER`     | Yes      | Mailtrap API / SMTP username          |
| `SMTP_PASSWORD` | Yes      | Mailtrap API / SMTP password          |
| `SMTP_SECURE`   | Yes      | `false`                               |
| `EMAIL_FROM`    | Yes      | `TaskFlow <no-reply@taskflow.dev>`    |

### Web Static Site (`taskflow-web`)

| Variable       | Required | Value / Description                        |
| :------------- | :------- | :----------------------------------------- |
| `VITE_API_URL` | Yes      | `https://<taskflow-api-slug>.onrender.com` |

---

## 5. Deployment Options on Render

### Option A: Render Blueprint (Recommended)

Because the repository includes [render.yaml](file:///f:/grok/project%201/render.yaml), you can provision all three services with a single click:

1. In the Render Dashboard, click **New +** -> **Blueprint**.
2. Connect your GitHub repository `sillibilli1/TaskFlow`.
3. Render parses `render.yaml` and lists the three services to be created.
4. Input the secret environment variables (`DATABASE_URL`, `REDIS_URL`, etc.).
5. Click **Apply**. Render will automatically build and deploy the services.

### Option B: Manual Service Creation via Dashboard

If preferred, you can create each service independently:

1. **API Web Service**:
   - Runtime: `Node`
   - Build Command: `npm install && npm run build --workspace=@cloud-saas/api`
   - Start Command: `node apps/api/dist/main.js`
   - Health Check Path: `/api/v1/health`
2. **Worker Web Service**:
   - Runtime: `Node`
   - Build Command: `npm install && npm run build --workspace=@cloud-saas/worker`
   - Start Command: `node apps/worker/dist/main.js`
   - Health Check Path: `/`
3. **Web Static Site**:
   - Build Command: `npm install && npm run build --workspace=@cloud-saas/web`
   - Publish Directory: `apps/web/dist`
   - Rewrite Rule: `/*` -> `/index.html`
