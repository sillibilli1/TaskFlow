import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

dotenv.config({
  path: join(dirname(fileURLToPath(import.meta.url)), "../.env"),
});
import { mkdir, readdir, readFile } from "node:fs/promises";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationsDir = fileURLToPath(new URL("../migrations/", import.meta.url));
await mkdir(migrationsDir, { recursive: true });
const client = new Client({
  connectionString: databaseUrl,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});
await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = await client.query("SELECT id FROM schema_migrations");
  const appliedIds = new Set(applied.rows.map((row) => row.id));
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (appliedIds.has(file)) continue;
    const sql = await readFile(join(migrationsDir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [
        file,
      ]);
      await client.query("COMMIT");
      console.log(`Applied migration ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
