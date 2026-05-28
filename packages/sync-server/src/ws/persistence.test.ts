import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import pg from "pg";
import * as Y from "yjs";
import { storeUpdate, getDocUpdates, getDocState, clearDocUpdates } from "./persistence";
import { getPool, closePool } from "../db/client";

function makeYjsUpdate(text: string): Uint8Array {
  const doc = new Y.Doc();
  doc.getText("test").insert(0, text);
  return Uint8Array.from(Y.encodeStateAsUpdate(doc));
}

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
if (!dbAvailable) console.log("PostgreSQL not available, skipping persistence tests");

let pool: pg.Pool;

beforeAll(async () => {
  if (!dbAvailable) return;
  pool = getPool();
});

afterAll(async () => {
  if (!dbAvailable) return;
  await closePool();
});

describe.skipIf(!dbAvailable)("persistence", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM yjs_updates");
    await pool.query(
      `INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      ["user-1", "testuser-persistence", "hash"],
    );
  });

  it("should store and retrieve updates", async () => {
    const update = new Uint8Array([1, 2, 3, 4, 5]);
    await storeUpdate("note:test-1", update, "user-1");
    const updates = await getDocUpdates("note:test-1");
    expect(updates).toHaveLength(1);
    expect(new Uint8Array(updates[0])).toEqual(update);
  });

  it("should return empty array for non-existent doc", async () => {
    const updates = await getDocUpdates("note:non-existent");
    expect(updates).toHaveLength(0);
  });

  it("should store multiple updates in order", async () => {
    await storeUpdate("note:test-2", new Uint8Array([1]), "user-1");
    await storeUpdate("note:test-2", new Uint8Array([2]), "user-1");
    await storeUpdate("note:test-2", new Uint8Array([3]), "user-1");
    const updates = await getDocUpdates("note:test-2");
    expect(updates).toHaveLength(3);
  });

  it("should get merged doc state", async () => {
    await storeUpdate("note:test-3", makeYjsUpdate("hello"), "user-1");
    await storeUpdate("note:test-3", makeYjsUpdate("world"), "user-1");
    const state = await getDocState("note:test-3");
    expect(state).toBeInstanceOf(Uint8Array);
    expect(state.length).toBeGreaterThan(0);
  });

  it("should clear doc updates", async () => {
    await storeUpdate("note:test-4", new Uint8Array([1]), "user-1");
    await clearDocUpdates("note:test-4");
    const updates = await getDocUpdates("note:test-4");
    expect(updates).toHaveLength(0);
  });
});
