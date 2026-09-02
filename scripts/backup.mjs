import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { Client } from "pg";

dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), "../.env"),
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Error: DATABASE_URL is not defined in .env");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

async function runBackup() {
  console.log("Connecting to Supabase PostgreSQL database...");
  await client.connect();

  try {
    const backupDir = join(
      dirname(fileURLToPath(import.meta.url)),
      "../backups",
    );
    await mkdir(backupDir, { recursive: true });

    const tables = [
      "schema_migrations",
      "users",
      "workspaces",
      "workspace_members",
      "projects",
      "tasks",
      "comments",
      "attachments",
      "activity_events",
      "refresh_tokens",
    ];

    const snapshot = {
      timestamp: new Date().toISOString(),
      database: "Supabase Postgres",
      tables: {},
      summary: {},
    };

    for (const table of tables) {
      try {
        const res = await client.query(`SELECT * FROM ${table} ORDER BY 1 ASC`);
        snapshot.tables[table] = res.rows;
        snapshot.summary[table] = res.rowCount;
        console.log(`✓ Backed up table ${table} (${res.rowCount} rows)`);
      } catch (err) {
        console.warn(`! Table ${table} skipped or not found: ${err.message}`);
      }
    }

    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const filepath = join(backupDir, filename);
    await writeFile(filepath, JSON.stringify(snapshot, null, 2), "utf8");

    console.log(`\nBackup successfully written to:\n${filepath}`);
    console.log("Summary:", snapshot.summary);
  } finally {
    await client.end();
  }
}

runBackup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
