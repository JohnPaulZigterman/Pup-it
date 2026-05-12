import pg from "pg";

const { Pool } = pg;

export const databaseUrl = process.env.DATABASE_URL || "";

export const db = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: Number(process.env.PG_POOL_MAX || 8),
      ssl:
        process.env.PGSSLMODE === "require" || process.env.PGSSL === "true"
          ? { rejectUnauthorized: false }
          : undefined
    })
  : null;

export function isDatabaseConfigured() {
  return Boolean(db);
}

export async function query(text, params = []) {
  if (!db) {
    const error = new Error("Postgres is not configured. Set DATABASE_URL to enable persistence.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }

  return db.query(text, params);
}

export async function checkDatabase() {
  if (!db) return { configured: false, ok: false };
  await query("select 1");
  return { configured: true, ok: true };
}
