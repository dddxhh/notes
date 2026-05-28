import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import pg from "pg";
import { metadataRoutes } from "./metadata";
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
if (!dbAvailable) console.log("PostgreSQL not available, skipping metadata tests");

const SECRET = "test-secret";
const TEST_USER_ID = "test-user-metadata";
let app: FastifyInstance;
let pool: pg.Pool;
let token: string;

function authHeader() {
  return { authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  if (!dbAvailable) return;
  pool = getPool();

  await pool.query(
    "DELETE FROM note_tags WHERE note_id IN (SELECT id FROM note_metadata WHERE user_id = $1)",
    [TEST_USER_ID],
  );
  await pool.query("DELETE FROM attachments WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query("DELETE FROM note_metadata WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query("DELETE FROM folders WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query("DELETE FROM tags WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query(
    `INSERT INTO users (id, username, password_hash) VALUES ($1, 'metadata-test', 'hash')
     ON CONFLICT (id) DO NOTHING`,
    [TEST_USER_ID],
  );

  token = signAccessToken({ userId: TEST_USER_ID, username: "metadata-test" }, SECRET);

  app = Fastify();
  await app.register(metadataRoutes, { prefix: "/api/v1" });
  await app.ready();
});

afterAll(async () => {
  if (!dbAvailable) return;
  await pool.query(
    "DELETE FROM note_tags WHERE note_id IN (SELECT id FROM note_metadata WHERE user_id = $1)",
    [TEST_USER_ID],
  );
  await pool.query("DELETE FROM attachments WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query("DELETE FROM note_metadata WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query("DELETE FROM folders WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query("DELETE FROM tags WHERE user_id = $1", [TEST_USER_ID]);
  await app?.close();
  await closePool();
});

describe.skipIf(!dbAvailable)("GET /metadata/sync", () => {
  beforeEach(async () => {
    await pool.query(
      "DELETE FROM note_tags WHERE note_id IN (SELECT id FROM note_metadata WHERE user_id = $1)",
      [TEST_USER_ID],
    );
    await pool.query("DELETE FROM note_metadata WHERE user_id = $1", [TEST_USER_ID]);
    await pool.query("DELETE FROM folders WHERE user_id = $1", [TEST_USER_ID]);
    await pool.query("DELETE FROM tags WHERE user_id = $1", [TEST_USER_ID]);
  });

  it("should return empty metadata when no data exists", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/metadata/sync",
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notes).toEqual([]);
    expect(body.folders).toEqual([]);
    expect(body.tags).toEqual([]);
    expect(body.noteTags).toEqual([]);
    expect(body.attachments).toEqual([]);
  });

  it("should return existing metadata", async () => {
    await pool.query(
      `INSERT INTO folders (id, user_id, name, parent_id, sort_order, created_at, updated_at)
       VALUES ('f1', $1, 'Work', NULL, 0, 1000, 1000)`,
      [TEST_USER_ID],
    );
    await pool.query(
      `INSERT INTO note_metadata (id, user_id, title, folder_id, type, created_at, updated_at, deleted_at, version)
       VALUES ('n1', $1, 'Test Note', 'f1', 'rich', 1000, 1000, NULL, 1)`,
      [TEST_USER_ID],
    );
    await pool.query(`INSERT INTO tags (id, user_id, name) VALUES ('t1', $1, 'work')`, [
      TEST_USER_ID,
    ]);
    await pool.query(`INSERT INTO note_tags (note_id, tag_id) VALUES ('n1', 't1')`);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/metadata/sync",
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.folders).toHaveLength(1);
    expect(body.folders[0].name).toBe("Work");
    expect(body.notes).toHaveLength(1);
    expect(body.notes[0].title).toBe("Test Note");
    expect(body.tags).toHaveLength(1);
    expect(body.noteTags).toHaveLength(1);
  });

  it("should reject unauthenticated request", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/metadata/sync",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe.skipIf(!dbAvailable)("POST /metadata/batch", () => {
  beforeEach(async () => {
    await pool.query(
      "DELETE FROM note_tags WHERE note_id IN (SELECT id FROM note_metadata WHERE user_id = $1)",
      [TEST_USER_ID],
    );
    await pool.query("DELETE FROM note_metadata WHERE user_id = $1", [TEST_USER_ID]);
    await pool.query("DELETE FROM folders WHERE user_id = $1", [TEST_USER_ID]);
    await pool.query("DELETE FROM tags WHERE user_id = $1", [TEST_USER_ID]);
  });

  it("should create folders and notes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/metadata/batch",
      headers: authHeader(),
      payload: {
        folders: [
          {
            id: "f2",
            name: "Personal",
            parentId: null,
            sortOrder: 0,
            createdAt: 2000,
            updatedAt: 2000,
          },
        ],
        notes: [
          {
            id: "n2",
            title: "Hello",
            folderId: "f2",
            type: "rich",
            createdAt: 2000,
            updatedAt: 2000,
            deletedAt: null,
            version: 1,
          },
        ],
        tags: [{ id: "t2", name: "personal" }],
        noteTags: [{ noteId: "n2", tagId: "t2" }],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const syncRes = await app.inject({
      method: "GET",
      url: "/api/v1/metadata/sync",
      headers: authHeader(),
    });
    const body = syncRes.json();
    expect(body.folders).toHaveLength(1);
    expect(body.notes).toHaveLength(1);
    expect(body.tags).toHaveLength(1);
    expect(body.noteTags).toHaveLength(1);
  });

  it("should update existing note with higher version", async () => {
    await pool.query(
      `INSERT INTO note_metadata (id, user_id, title, folder_id, type, created_at, updated_at, deleted_at, version)
       VALUES ('n3', $1, 'Old Title', NULL, 'rich', 1000, 1000, NULL, 1)`,
      [TEST_USER_ID],
    );

    await app.inject({
      method: "POST",
      url: "/api/v1/metadata/batch",
      headers: authHeader(),
      payload: {
        notes: [
          {
            id: "n3",
            title: "New Title",
            folderId: null,
            type: "rich",
            createdAt: 1000,
            updatedAt: 2000,
            deletedAt: null,
            version: 2,
          },
        ],
      },
    });

    const syncRes = await app.inject({
      method: "GET",
      url: "/api/v1/metadata/sync",
      headers: authHeader(),
    });
    expect(syncRes.json().notes[0].title).toBe("New Title");
    expect(syncRes.json().notes[0].version).toBe(2);
  });

  it("should not overwrite with lower version", async () => {
    await pool.query(
      `INSERT INTO note_metadata (id, user_id, title, folder_id, type, created_at, updated_at, deleted_at, version)
       VALUES ('n4', $1, 'Current', NULL, 'rich', 1000, 3000, NULL, 5)`,
      [TEST_USER_ID],
    );

    await app.inject({
      method: "POST",
      url: "/api/v1/metadata/batch",
      headers: authHeader(),
      payload: {
        notes: [
          {
            id: "n4",
            title: "Stale",
            folderId: null,
            type: "rich",
            createdAt: 1000,
            updatedAt: 2000,
            deletedAt: null,
            version: 3,
          },
        ],
      },
    });

    const syncRes = await app.inject({
      method: "GET",
      url: "/api/v1/metadata/sync",
      headers: authHeader(),
    });
    expect(syncRes.json().notes[0].title).toBe("Current");
    expect(syncRes.json().notes[0].version).toBe(5);
  });

  it("should delete notes and folders", async () => {
    await pool.query(
      `INSERT INTO folders (id, user_id, name, parent_id, sort_order, created_at, updated_at)
       VALUES ('f3', $1, 'ToDelete', NULL, 0, 1000, 1000)`,
      [TEST_USER_ID],
    );
    await pool.query(
      `INSERT INTO note_metadata (id, user_id, title, folder_id, type, created_at, updated_at, deleted_at, version)
       VALUES ('n5', $1, 'ToDelete', NULL, 'rich', 1000, 1000, NULL, 1)`,
      [TEST_USER_ID],
    );

    await app.inject({
      method: "POST",
      url: "/api/v1/metadata/batch",
      headers: authHeader(),
      payload: {
        deletedFolderIds: ["f3"],
        deletedNoteIds: ["n5"],
      },
    });

    const syncRes = await app.inject({
      method: "GET",
      url: "/api/v1/metadata/sync",
      headers: authHeader(),
    });
    expect(syncRes.json().folders).toHaveLength(0);
    expect(syncRes.json().notes).toHaveLength(0);
  });
});
