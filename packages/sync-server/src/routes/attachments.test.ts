import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import pg from "pg";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { attachmentRoutes } from "./attachments";
import { getPool, closePool } from "../db/client";
import { signAccessToken } from "../auth/token";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://notes:notes@localhost:5432/notes_sync";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ATTACHMENT_DIR = "/tmp/sync-server-test-attachments";

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
if (!dbAvailable) console.log("PostgreSQL not available, skipping attachment tests");

const SECRET = "test-secret";
const TEST_USER_ID = "test-user-attachments";
let app: FastifyInstance;
let pool: pg.Pool;
let token: string;

function authHeader() {
  return { authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  if (!dbAvailable) return;
  pool = getPool();

  await pool.query("DELETE FROM attachments WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query(
    `INSERT INTO users (id, username, password_hash) VALUES ($1, 'att-test', 'hash')
     ON CONFLICT (id) DO NOTHING`,
    [TEST_USER_ID],
  );
  await pool.query(
    `INSERT INTO note_metadata (id, user_id, title, folder_id, type, created_at, updated_at, deleted_at, version)
     VALUES ('att-note-1', $1, 'Test', NULL, 'rich', 1000, 1000, NULL, 1)
     ON CONFLICT (id) DO NOTHING`,
    [TEST_USER_ID],
  );

  token = signAccessToken({ userId: TEST_USER_ID, username: "att-test" }, SECRET);

  await mkdir(process.env.ATTACHMENT_DIR!, { recursive: true });

  app = Fastify();
  await app.register(multipart);
  await app.register(attachmentRoutes, { prefix: "/api/v1" });
  await app.ready();
});

afterAll(async () => {
  if (!dbAvailable) return;
  await pool.query("DELETE FROM attachments WHERE user_id = $1", [TEST_USER_ID]);
  await pool.query("DELETE FROM note_metadata WHERE id = 'att-note-1'");
  await app?.close();
  await closePool();
  try {
    await rm(process.env.ATTACHMENT_DIR!, { recursive: true });
  } catch {}
});

describe.skipIf(!dbAvailable)("attachments", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM attachments WHERE user_id = $1", [TEST_USER_ID]);
    const dir = join(process.env.ATTACHMENT_DIR!, TEST_USER_ID);
    try {
      await rm(dir, { recursive: true });
    } catch {}
  });

  it("should upload an attachment", async () => {
    const meta = {
      id: "att-1",
      noteId: "att-note-1",
      type: "image",
      filename: "test.png",
      mimeType: "image/png",
      size: 11,
      createdAt: 1000,
    };

    const form = new FormData();
    form.append("meta", JSON.stringify(meta));
    form.append("file", new Blob(["hello world"]), "test.png");

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/attachments",
      headers: authHeader(),
      payload: form as any,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe("att-1");
  });

  it("should download an attachment", async () => {
    const meta = {
      id: "att-2",
      noteId: "att-note-1",
      type: "image",
      filename: "test.png",
      mimeType: "image/png",
      size: 11,
      createdAt: 1000,
    };

    const form = new FormData();
    form.append("meta", JSON.stringify(meta));
    form.append("file", new Blob(["hello world"]), "test.png");

    await app.inject({
      method: "POST",
      url: "/api/v1/attachments",
      headers: authHeader(),
      payload: form as any,
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/attachments/att-2",
      headers: authHeader(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  });

  it("should delete an attachment", async () => {
    const meta = {
      id: "att-3",
      noteId: "att-note-1",
      type: "image",
      filename: "test.png",
      mimeType: "image/png",
      size: 11,
      createdAt: 1000,
    };

    const form = new FormData();
    form.append("meta", JSON.stringify(meta));
    form.append("file", new Blob(["hello world"]), "test.png");

    await app.inject({
      method: "POST",
      url: "/api/v1/attachments",
      headers: authHeader(),
      payload: form as any,
    });

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/attachments/att-3",
      headers: authHeader(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);

    const getRes = await app.inject({
      method: "GET",
      url: "/api/v1/attachments/att-3",
      headers: authHeader(),
    });
    expect(getRes.statusCode).toBe(404);
  });

  it("should return 404 for non-existent attachment", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/attachments/non-existent",
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(404);
  });
});
