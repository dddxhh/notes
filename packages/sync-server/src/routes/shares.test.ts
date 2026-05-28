import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import pg from "pg";
import { shareRoutes } from "./shares";
import { getPool, closePool } from "../db/client";
import { signAccessToken } from "../auth/token";

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
if (!dbAvailable) console.log("PostgreSQL not available, skipping share tests");

const SECRET = "test-secret";
const OWNER_ID = "share-owner";
const OTHER_ID = "share-other";
let app: FastifyInstance;
let pool: pg.Pool;
let ownerToken: string;
let otherToken: string;

function ownerAuth() {
  return { authorization: `Bearer ${ownerToken}` };
}

function otherAuth() {
  return { authorization: `Bearer ${otherToken}` };
}

beforeAll(async () => {
  if (!dbAvailable) return;
  pool = getPool();

  await pool.query("DELETE FROM shares WHERE user_id IN ($1, $2)", [OWNER_ID, OTHER_ID]);
  await pool.query("DELETE FROM note_metadata WHERE user_id IN ($1, $2)", [OWNER_ID, OTHER_ID]);
  await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [OWNER_ID, OTHER_ID]);

  await pool.query(
    `INSERT INTO users (id, username, password_hash) VALUES ($1, 'share-owner', 'hash'), ($2, 'share-other', 'hash')`,
    [OWNER_ID, OTHER_ID],
  );
  await pool.query(
    `INSERT INTO note_metadata (id, user_id, title, folder_id, type, created_at, updated_at, deleted_at, version)
     VALUES ('share-note-1', $1, 'Shared Note', NULL, 'rich', 1000, 1000, NULL, 1)`,
    [OWNER_ID],
  );

  ownerToken = signAccessToken({ userId: OWNER_ID, username: "share-owner" }, SECRET);
  otherToken = signAccessToken({ userId: OTHER_ID, username: "share-other" }, SECRET);

  app = Fastify();
  await app.register(shareRoutes, { prefix: "/api/v1" });
  await app.ready();
});

afterAll(async () => {
  if (!dbAvailable) return;
  await pool.query("DELETE FROM shares WHERE user_id IN ($1, $2)", [OWNER_ID, OTHER_ID]);
  await pool.query("DELETE FROM note_metadata WHERE user_id IN ($1, $2)", [OWNER_ID, OTHER_ID]);
  await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [OWNER_ID, OTHER_ID]);
  await app?.close();
  await closePool();
});

describe.skipIf(!dbAvailable)("POST /shares", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM shares WHERE user_id = $1", [OWNER_ID]);
  });

  it("should create a public link share", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/shares",
      headers: ownerAuth(),
      payload: { noteId: "share-note-1", type: "public_link" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.type).toBe("public_link");
    expect(body.shareToken).toBeDefined();
    expect(body.noteId).toBe("share-note-1");
  });

  it("should create a user share", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/shares",
      headers: ownerAuth(),
      payload: {
        noteId: "share-note-1",
        type: "user_share",
        targetUsername: "share-other",
        permission: "write",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.type).toBe("user_share");
    expect(body.permission).toBe("write");
    expect(body.targetUsername).toBe("share-other");
  });

  it("should reject sharing non-existent note", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/shares",
      headers: ownerAuth(),
      payload: { noteId: "non-existent", type: "public_link" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should reject sharing with non-existent user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/shares",
      headers: ownerAuth(),
      payload: {
        noteId: "share-note-1",
        type: "user_share",
        targetUsername: "nobody",
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should reject sharing with yourself", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/shares",
      headers: ownerAuth(),
      payload: {
        noteId: "share-note-1",
        type: "user_share",
        targetUsername: "share-owner",
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe.skipIf(!dbAvailable)("GET /shares", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM shares WHERE user_id = $1", [OWNER_ID]);
  });

  it("should list shares", async () => {
    await app.inject({
      method: "POST",
      url: "/api/v1/shares",
      headers: ownerAuth(),
      payload: { noteId: "share-note-1", type: "public_link" },
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/shares",
      headers: ownerAuth(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].noteTitle).toBe("Shared Note");
  });
});

describe.skipIf(!dbAvailable)("DELETE /shares/:id", () => {
  it("should delete a share", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/v1/shares",
      headers: ownerAuth(),
      payload: { noteId: "share-note-1", type: "public_link" },
    });
    const { id } = createRes.json();

    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/shares/${id}`,
      headers: ownerAuth(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });

  it("should return 404 for non-existent share", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/shares/non-existent",
      headers: ownerAuth(),
    });

    expect(res.statusCode).toBe(404);
  });
});
