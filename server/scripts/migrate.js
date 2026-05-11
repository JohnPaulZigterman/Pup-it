import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, query } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.resolve(__dirname, "../migrations");

if (!db) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const { readdir } = await import("node:fs/promises");
const migrationFiles = (await readdir(migrationsPath))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();

for (const fileName of migrationFiles) {
  const sql = await readFile(path.join(migrationsPath, fileName), "utf8");
  await query(sql);
}
await db.end();
console.log(`Postgres migrations applied: ${migrationFiles.join(", ")}`);
