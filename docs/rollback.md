# Redeployment & Rollback Procedures

This runbook outlines standard operating procedures for rolling back application code, configuration, or database migrations in the event of a production incident.

---

## 1. When to Initiate a Rollback

Trigger a rollback immediately if any of the following occur following a production release:

- UptimeRobot fires a **DOWN Alert** and `/api/v1/health` fails to respond.
- `/api/v1/ready` reports database or Redis connectivity failure.
- Core user journeys (authentication, workspace access, task creation) fail consistently.
- Unhandled 500 error spikes in Render service logs.

---

## 2. Rollback Methods

### Method 1: Instant One-Click Rollback in Render (Fastest — < 30 seconds)

Render maintains immutable container artifacts of past successful deployments. You can instantly restore any prior version without rebuilding from Git.

1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Select the affected service (`taskflow-api`, `taskflow-worker`, or `taskflow-web`).
3. Click the **Events** or **Deploys** tab in the left sidebar.
4. Locate the last known-healthy deployment in the history list.
5. Click the three dots (`...`) on that deploy and select **Rollback to this deploy**.
6. Render immediately provisions the previous container build and cuts over edge traffic.
7. Repeat for the other services if a multi-service rollback is required.

---

### Method 2: Git Revert Rollback (Standard GitOps Flow)

If you want the rollback recorded cleanly in Git history and triggered through auto-deploy:

```bash
# 1. Identify the bad commit hash
git log -n 5 --oneline

# 2. Create a revert commit
git revert HEAD --no-edit

# 3. Push to main branch
git push origin main
```

- Render detects the new commit on `main` and automatically triggers a build and zero-downtime deployment.
- This approach ensures that your local Git repository, GitHub, and Render remain strictly in sync.

---

## 3. Database Migration Rollback Strategy

### Forward-Compatible (Expand & Contract) Guideline

TaskFlow migrations are designed with backward compatibility in mind:

- New columns are added as `NULLABLE` or with defaults so previous application versions can run without errors.
- Tables are never dropped in the same release that deprecates them.

### Reversing a Migration

If a migration must be undone:

1. Identify the migration file in [migrations/](file:///f:/grok/project%201/migrations/).
2. Connect to the database via `psql` or the Supabase SQL Editor:
   ```bash
   psql -d "$DATABASE_URL"
   ```
3. Execute the inverse DDL statements (e.g. `DROP COLUMN`, `DROP TABLE`).
4. Remove the migration identifier from the ledger:
   ```sql
   DELETE FROM schema_migrations WHERE id = '000X_problematic_migration.sql';
   ```

### Disaster Recovery: Restore from Snapshot Backup

If data corruption occurred:

1. Refer to [Database Backups Guide](file:///f:/grok/project%201/docs/backups.md).
2. Restore the pre-deployment dump using:
   ```bash
   psql -d "$DATABASE_URL" -f pre_deploy_backup.sql
   ```

---

## 4. Post-Rollback Verification Checklist

Following any rollback, confirm operational health:

- [ ] Verify `https://<api-slug>.onrender.com/api/v1/health` returns `{"status": "ok"}`.
- [ ] Verify `https://<api-slug>.onrender.com/api/v1/ready` returns `{"status": "ready", "dependencies": {"postgres": "up", "redis": "up"}}`.
- [ ] Open the web frontend in an incognito window, log in, and verify task lists render.
- [ ] Confirm UptimeRobot reports status as `UP (200 OK)`.
- [ ] Download deployment logs from Render for post-incident root-cause investigation.
