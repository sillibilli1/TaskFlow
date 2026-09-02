# Staging Environment & Branch Strategy

This guide describes how to configure, maintain, and promote changes through a separated **Staging Environment** on Render within free-tier resource limits.

---

## 1. Environment Separation Architecture

```text
[ Feature Branch ] ──(Pull Request)──> [ 'staging' Branch ] ──(Deploy)──> [ Staging Environment ]
                                                                             ├── taskflow-web-staging
                                                                             ├── taskflow-api-staging
                                                                             └── Staging DB / Redis
                                                                                      │
                                                                           (QA & Smoke Validation)
                                                                                      │
                                                                                      ▼
[ 'staging' Branch ] ──(Pull Request)──> [ 'main' Branch ] ──(Deploy)───> [ Production Environment ]
                                                                             ├── taskflow-web
                                                                             ├── taskflow-api
                                                                             └── Production DB / Redis
```

---

## 2. Free-Tier Instance Hour Management

> [!IMPORTANT]
> **Understanding Render's 750 Free Hours / Month Pool**:
> Render allocates **750 free instance hours per calendar month per account** shared across all free Web Services.
> A single month has approximately 720–744 hours.
>
> - If **Production** runs 24/7 (kept warm by UptimeRobot), it consumes ~720 hours.
> - If **Staging** was also kept warm 24/7, total usage would reach ~1,440 hours, which exceeds the free allowance and suspends free services mid-month.

### Free-Tier Optimization Strategy:

1. **Never attach keep-alive pings to Staging**:
   Allow Staging Web Services (`taskflow-api-staging`, `taskflow-worker-staging`) to spin down when idle (after 15 minutes).
2. **On-Demand Consumption**:
   Staging only runs during active testing. A QA session consuming 2 hours per day uses ~60 hours per month, comfortably fitting alongside production within the 750-hour budget.
3. **Multi-Account Alternative**:
   Alternatively, create a second free Render account dedicated exclusively to the staging environment, giving staging its own 750 free hours.

---

## 3. Data & Secret Isolation

Staging must never connect to production data stores:

| Resource                | Production                          | Staging                                                  |
| :---------------------- | :---------------------------------- | :------------------------------------------------------- |
| **Git Branch**          | `main`                              | `staging`                                                |
| **Render Web URL**      | `https://taskflow-web.onrender.com` | `https://taskflow-web-staging.onrender.com`              |
| **Render API URL**      | `https://taskflow-api.onrender.com` | `https://taskflow-api-staging.onrender.com`              |
| **PostgreSQL Database** | Primary Supabase project            | Separate Supabase project (or distinct `staging` schema) |
| **Redis Queue & Cache** | Upstash DB #1                       | Upstash DB #2 (free tier allows multiple databases)      |
| **Storage Bucket**      | `attachments` (production)          | `attachments-staging`                                    |
| **Email SMTP**          | Mailtrap Project Inbox              | Mailtrap Staging Inbox                                   |

---

## 4. Setting Up Staging on Render

### Step 1: Create the Staging Branch in Git

```bash
# Create and push staging branch from main
git checkout -b staging
git push -u origin staging
```

### Step 2: Create Staging Services on Render

In the Render dashboard:

1. **`taskflow-api-staging`**:
   - Create Web Service pointing to repository `sillibilli1/TaskFlow`.
   - Branch: `staging`
   - Build Command: `npm install && npm run build --workspace=@cloud-saas/api`
   - Start Command: `node apps/api/dist/main.js`
   - Health Check Path: `/api/v1/health`
   - Set staging environment variables (with staging database credentials and `CORS_ORIGINS=https://taskflow-web-staging.onrender.com`).
2. **`taskflow-web-staging`**:
   - Create Static Site pointing to branch `staging`.
   - Build Command: `npm install && npm run build --workspace=@cloud-saas/web`
   - Publish Directory: `apps/web/dist`
   - Set `VITE_API_URL=https://taskflow-api-staging.onrender.com`.

---

## 5. Promotion Runbook: Staging to Production

1. **Develop and Test on Feature Branch**:
   Ensure unit, integration, and build tests pass locally.
2. **Open PR into `staging`**:
   Merging triggers automatic deploy to `taskflow-web-staging` and `taskflow-api-staging`.
3. **Verify on Staging**:
   - Perform user registration / login check.
   - Run sample task lifecycle: create workspace, create project, create task, upload attachment.
   - Confirm Mailtrap captures staging notifications.
4. **Open PR from `staging` into `main`**:
   GitHub Actions CI executes lint, typecheck, tests, and Docker image builds.
5. **Merge PR into `main`**:
   Render automatically deploys the verified changes to production.
