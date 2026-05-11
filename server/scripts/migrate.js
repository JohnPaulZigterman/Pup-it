import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, query } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationPath = path.resolve(__dirname, "../migrations/001_core_project_model.sql");

if (!db) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const sql = await readFile(migrationPath, "utf8");
await query(sql);
await db.end();
console.log("Postgres migrations applied.");
