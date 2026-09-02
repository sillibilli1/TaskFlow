# Database Backups & Disaster Recovery Guide

This guide details the database backup policies, constraints, and manual backup/restore procedures for TaskFlow running on **Supabase Free Tier**.

---

## 1. Supabase Free-Tier Backup Behavior & Limitations

| Feature                           | Supabase Free Tier                                        | Supabase Pro Tier ($25/mo)   |
| :-------------------------------- | :-------------------------------------------------------- | :--------------------------- |
| **Automated Daily Backups**       | ❌ Not included (dashboard download unavailable)          | ✅ 7 days of daily snapshots |
| **Point-in-Time Recovery (PITR)** | ❌ Not available                                          | ✅ Up to 7 or 30 days        |
| **Project Inactivity Pausing**    | ⚠️ Pauses after **7 days** without HTTP/database activity | ✅ Never pauses              |
| **Direct PostgreSQL Access**      | ✅ Full access via Port 5432 / 6543 (pg_dump / psql)      | ✅ Full access               |

> [!IMPORTANT]
> Because Supabase Free Tier does not perform automated point-in-time recovery or downloadable snapshot backups, **regular manual backups via `pg_dump` are essential** before applying database migrations or making schema modifications.

---

## 2. Automated & Verified Backup Command (`npm run db:backup`)

The repository includes a pre-configured, dependency-free backup script [`scripts/backup.mjs`](file:///f:/grok/project%201/scripts/backup.mjs) that connects directly to Supabase using your `.env` credentials. It runs on Windows, macOS, and Linux without requiring PostgreSQL client binaries (`pg_dump`) installed locally:

```powershell
npm run db:backup
```

### Verified Live Output:

```text
Connecting to Supabase PostgreSQL database...
✓ Backed up table schema_migrations (5 rows)
✓ Backed up table users (35 rows)
✓ Backed up table workspaces (12 rows)
✓ Backed up table workspace_members (23 rows)
✓ Backed up table projects (12 rows)
✓ Backed up table tasks (8 rows)
✓ Backed up table comments (5 rows)
✓ Backed up table attachments (4 rows)
✓ Backed up table activity_events (43 rows)
✓ Backed up table refresh_tokens (51 rows)

Backup successfully written to:
backups/backup_2026-09-02T22-42-38-331Z.json
```

All 10 tables are extracted, structured, and saved with ISO timestamps in the git-ignored `backups/` directory.

---

## 3. Manual SQL Backup Procedure (`pg_dump`)

### Prerequisites

- PostgreSQL client utilities installed (`pg_dump` and `psql` v15+).
- Your Supabase PostgreSQL connection string (`DATABASE_URL`).

### Full Database Backup (Schema + Data)

Run the following command in PowerShell or bash:

```powershell
# In PowerShell:
$env:PGPASSWORD = "your-supabase-db-password"
pg_dump --clean --if-exists --no-owner --no-privileges -h db.YOUR_PROJECT_REF.supabase.co -U postgres -d postgres -f "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
```

Or using the standard PostgreSQL URI:

```bash
pg_dump --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" -f "backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Explanation of Flags:

- `--clean`: Generates `DROP TABLE` statements before `CREATE TABLE` so existing objects are cleaned up upon restore.
- `--if-exists`: Avoids errors when dropping objects that do not exist in the target database.
- `--no-owner`: Omits `ALTER OWNER` commands, ensuring the backup can be restored into any role/user.
- `--no-privileges`: Omits `GRANT`/`REVOKE` statements that might conflict with Supabase default permissions.

### Schema-Only Backup

To capture only table definitions, indexes, constraints, and migrations without user records:

```bash
pg_dump --schema-only --no-owner --no-privileges -d "$DATABASE_URL" -f "schema_backup.sql"
```

### Data-Only Backup

To capture only user and tenant records without altering schema objects:

```bash
pg_dump --data-only --no-owner --no-privileges -d "$DATABASE_URL" -f "data_backup.sql"
```

---

## 3. Manual Restore Procedure (`psql`)

> [!CAUTION]
> Restoring a full database backup will overwrite existing records with the state from the backup file. Always take an ad-hoc backup of the current database before running a restore.

### Step 1: Put Application in Maintenance Mode (Optional)

If necessary, temporarily suspend the API in Render or scale down workers to prevent conflicting writes during restore:

```bash
# Verify active connections
psql -d "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres';"
```

### Step 2: Restore from SQL Dump

Execute the restore script against the target database:

```bash
psql -d "$DATABASE_URL" -f backup_20260903_010000.sql
```

If restoring into a fresh database, run the migration runner to ensure all migrations are in sync:

```powershell
npm run db:migrate
```

### Step 3: Verify Data Integrity Post-Restore

Run validation queries to confirm record counts and migration ledger:

```sql
-- Check schema migrations record
SELECT * FROM schema_migrations ORDER BY applied_at DESC;

-- Verify core tenant boundaries
SELECT id, name, created_at FROM workspaces;
SELECT count(*) FROM users;
SELECT count(*) FROM tasks;
```

---

## 4. Supabase Project Pause Prevention

Supabase automatically pauses free-tier projects if they receive no queries for **7 consecutive days**.

To prevent inactivity pausing:

1. The **UptimeRobot** monitor targeting `https://<api-slug>.onrender.com/api/v1/ready` sends a periodic request that executes `SELECT 1` against the database every 5 minutes.
2. If your project is ever paused, log into [supabase.com/dashboard](https://supabase.com/dashboard), locate your project, and click **Restore Project** (takes 1-2 minutes to re-provision).
