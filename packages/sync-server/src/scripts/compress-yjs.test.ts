import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import pg from "pg";
import * as Y from "yjs";
import { getPool, closePool } from "../db/client";
import { compressAllDocs } from "./compress-yjs";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://notes:notes@localhost:5432/notes_sync";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

async function checkDb(): Promise<boolean> {
  try {
    const probe = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await probe.query("SELECT 1");
    await probe.end();
    return true;
  } catch {
    return false;
  }
}

const dbAvailable = await checkDb();
if (!dbAvailable) console.log("PostgreSQL not available, skipping compress-yjs tests");

const TEST_USER = "test-compress-user";
const DOC_NAME = "note:test-compress";

function makeYjsUpdate(text: string): Buffer {
  const doc = new Y.Doc();
  doc.getText("test").insert(0, text);
  return Buffer.from(Y.encodeStateAsUpdate(doc));
}

beforeAll(async () => {
  if (!dbAvailable) return;
  const pool = getPool();
  await pool.query(
    `INSERT INTO users (id, username, password_hash) VALUES ($1, $2, 'hash') ON CONFLICT DO NOTHING`,
    [TEST_USER, TEST_USER],
  );
});

afterAll(async () => {
  if (!dbAvailable) return;
  const pool = getPool();
  await pool.query(`DELETE FROM yjs_updates WHERE doc_name = $1`, [DOC_NAME]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [TEST_USER]);
  await closePool();
});

describe.skipIf(!dbAvailable)("compress-yjs", () => {
  beforeEach(async () => {
    const pool = getPool();
    await pool.query(`DELETE FROM yjs_updates WHERE doc_name = $1`, [DOC_NAME]);
    await pool.query(
      `INSERT INTO yjs_updates (user_id, doc_name, update, clock) VALUES ($1, $2, $3, 1)`,
      [TEST_USER, DOC_NAME, makeYjsUpdate("hello")],
    );
    await pool.query(
      `INSERT INTO yjs_updates (user_id, doc_name, update, clock) VALUES ($1, $2, $3, 2)`,
      [TEST_USER, DOC_NAME, makeYjsUpdate("world")],
    );
  });

  it("compresses multiple updates into one", async () => {
    const pool = getPool();
    const before = await pool.query(`SELECT COUNT(*) FROM yjs_updates WHERE doc_name = $1`, [
      DOC_NAME,
    ]);
    expect(Number(before.rows[0].count)).toBeGreaterThanOrEqual(2);

    await compressAllDocs();

    const after = await pool.query(`SELECT COUNT(*) FROM yjs_updates WHERE doc_name = $1`, [
      DOC_NAME,
    ]);
    expect(Number(after.rows[0].count)).toBe(1);
  });

  it("preserves document content after compression", async () => {
    await compressAllDocs();

    const pool = getPool();
    const result = await pool.query(`SELECT update FROM yjs_updates WHERE doc_name = $1`, [
      DOC_NAME,
    ]);
    expect(result.rows).toHaveLength(1);

    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(result.rows[0].update));
    const content = doc.getText("test").toString();
    expect(content).toContain("hello");
    expect(content).toContain("world");
  });
});
