import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getPool, closePool } from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate(): Promise<void> {
  const pool = getPool();
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");

  console.log("Running migrations...");
  await pool.query(sql);
  console.log("Migrations complete.");

  await closePool();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
