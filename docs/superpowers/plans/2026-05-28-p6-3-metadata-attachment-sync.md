# P6.3 — 元数据 REST 同步 + 附件同步 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现元数据（folders/tags/note_metadata）的 REST 同步 API 和附件的上传/下载 API，使客户端能跨设备同步非内容数据。

**Architecture:** 服务端新增两组 REST 路由：metadata（全量拉取 + 批量推送，last-write-wins 冲突策略）和 attachments（multipart 上传 + 流式下载 + 删除）。所有路由通过 authMiddleware 保护。附件二进制文件存储在本地磁盘（`ATTACHMENT_DIR`）。

**Tech Stack:** Fastify, @fastify/multipart, @fastify/static, pg (node-postgres), authMiddleware (已有)

---

## 文件结构

```
packages/sync-server/
└── src/
    ├── routes/
    │   ├── metadata.ts          # GET /metadata/sync, POST /metadata/batch
    │   ├── metadata.test.ts     # metadata 路由测试
    │   ├── attachments.ts       # POST/GET/DELETE /attachments
    │   └── attachments.test.ts  # attachments 路由测试
    └── server.ts                # 修改：注册新路由
```

---

## Task 1: 元数据同步路由 — GET /metadata/sync

**Files:**

- Create: `packages/sync-server/src/routes/metadata.ts`

- [ ] **Step 1: 实现 metadata.ts**

```ts
import { type FastifyPluginAsync } from "fastify";
import { authMiddleware } from "../auth/middleware";
import { getPool } from "../db/client";

export const metadataRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authMiddleware);

  app.get("/metadata/sync", async (request, reply) => {
    const { userId } = request.user;
    const pool = getPool();

    const [notes, folders, tags, noteTags, attachments] = await Promise.all([
      pool.query(
        `SELECT id, title, folder_id, type, created_at, updated_at, deleted_at, version
         FROM note_metadata WHERE user_id = $1`,
        [userId],
      ),
      pool.query(
        `SELECT id, name, parent_id, sort_order, created_at, updated_at
         FROM folders WHERE user_id = $1`,
        [userId],
      ),
      pool.query(`SELECT id, name FROM tags WHERE user_id = $1`, [userId]),
      pool.query(
        `SELECT nt.note_id, nt.tag_id FROM note_tags nt
         JOIN note_metadata nm ON nm.id = nt.note_id
         WHERE nm.user_id = $1`,
        [userId],
      ),
      pool.query(
        `SELECT id, note_id, type, filename, mime_type, size, created_at
         FROM attachments WHERE user_id = $1`,
        [userId],
      ),
    ]);

    return reply.send({
      notes: notes.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        folderId: r.folder_id,
        type: r.type,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at,
        version: r.version,
      })),
      folders: folders.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        parentId: r.parent_id,
        sortOrder: r.sort_order,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      tags: tags.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
      })),
      noteTags: noteTags.rows.map((r: any) => ({
        noteId: r.note_id,
        tagId: r.tag_id,
      })),
      attachments: attachments.rows.map((r: any) => ({
        id: r.id,
        noteId: r.note_id,
        type: r.type,
        filename: r.filename,
        mimeType: r.mime_type,
        size: r.size,
        createdAt: r.created_at,
      })),
    });
  });
};
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/sync-server typecheck
```

预期：PASS

- [ ] **Step 3: Commit**

```bash
git add packages/sync-server/src/routes/metadata.ts
git commit -m "feat: add GET /metadata/sync route for full metadata pull"
```

---

## Task 2: 元数据同步路由 — POST /metadata/batch

**Files:**

- Modify: `packages/sync-server/src/routes/metadata.ts`

- [ ] **Step 1: 在 metadata.ts 中添加 POST /metadata/batch 路由**

在 `metadataRoutes` 函数内、`app.get("/metadata/sync", ...)` 之后添加：

```ts
app.post("/metadata/batch", async (request, reply) => {
  const { userId } = request.user;
  const pool = getPool();
  const body = request.body as {
    notes?: Array<{
      id: string;
      title: string;
      folderId: string | null;
      type: string;
      createdAt: number;
      updatedAt: number;
      deletedAt: number | null;
      version: number;
    }>;
    folders?: Array<{
      id: string;
      name: string;
      parentId: string | null;
      sortOrder: number;
      createdAt: number;
      updatedAt: number;
    }>;
    tags?: Array<{ id: string; name: string }>;
    noteTags?: Array<{ noteId: string; tagId: string }>;
    deletedNoteIds?: string[];
    deletedFolderIds?: string[];
    deletedTagIds?: string[];
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (body.folders) {
      for (const f of body.folders) {
        await client.query(
          `INSERT INTO folders (id, user_id, name, parent_id, sort_order, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
               sort_order = EXCLUDED.sort_order, updated_at = EXCLUDED.updated_at
             WHERE folders.updated_at < EXCLUDED.updated_at`,
          [f.id, userId, f.name, f.parentId, f.sortOrder, f.createdAt, f.updatedAt],
        );
      }
    }

    if (body.deletedFolderIds) {
      for (const id of body.deletedFolderIds) {
        await client.query(`DELETE FROM folders WHERE id = $1 AND user_id = $2`, [id, userId]);
      }
    }

    if (body.notes) {
      for (const n of body.notes) {
        await client.query(
          `INSERT INTO note_metadata (id, user_id, title, folder_id, type, created_at, updated_at, deleted_at, version)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title, folder_id = EXCLUDED.folder_id,
               type = EXCLUDED.type, updated_at = EXCLUDED.updated_at,
               deleted_at = EXCLUDED.deleted_at, version = EXCLUDED.version
             WHERE note_metadata.version < EXCLUDED.version`,
          [
            n.id,
            userId,
            n.title,
            n.folderId,
            n.type,
            n.createdAt,
            n.updatedAt,
            n.deletedAt,
            n.version,
          ],
        );
      }
    }

    if (body.deletedNoteIds) {
      for (const id of body.deletedNoteIds) {
        await client.query(`DELETE FROM note_metadata WHERE id = $1 AND user_id = $2`, [
          id,
          userId,
        ]);
      }
    }

    if (body.tags) {
      for (const t of body.tags) {
        await client.query(
          `INSERT INTO tags (id, user_id, name) VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [t.id, userId, t.name],
        );
      }
    }

    if (body.deletedTagIds) {
      for (const id of body.deletedTagIds) {
        await client.query(`DELETE FROM tags WHERE id = $1 AND user_id = $2`, [id, userId]);
      }
    }

    if (body.noteTags) {
      await client.query(
        `DELETE FROM note_tags WHERE note_id IN (SELECT id FROM note_metadata WHERE user_id = $1)`,
        [userId],
      );
      for (const nt of body.noteTags) {
        await client.query(
          `INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [nt.noteId, nt.tagId],
        );
      }
    }

    await client.query("COMMIT");
    return reply.send({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/sync-server typecheck
```

预期：PASS

- [ ] **Step 3: Commit**

```bash
git add packages/sync-server/src/routes/metadata.ts
git commit -m "feat: add POST /metadata/batch route for metadata push with last-write-wins"
```

---

## Task 3: 元数据路由测试

**Files:**

- Create: `packages/sync-server/src/routes/metadata.test.ts`

- [ ] **Step 1: 创建 metadata.test.ts**

```ts
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
```

- [ ] **Step 2: 运行测试**

```bash
DATABASE_URL=postgres://notes:notes@localhost:5432/notes_sync JWT_SECRET=test-secret JWT_REFRESH_SECRET=test-refresh-secret pnpm --filter @notes/sync-server test -- --run src/routes/metadata.test.ts
```

预期：7 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/sync-server/src/routes/metadata.test.ts
git commit -m "feat: add metadata route tests (sync + batch)"
```

---

## Task 4: 附件上传/下载路由

**Files:**

- Create: `packages/sync-server/src/routes/attachments.ts`

- [ ] **Step 1: 实现 attachments.ts**

```ts
import { type FastifyPluginAsync } from "fastify";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { pipeline } from "stream/promises";
import { createReadStream } from "fs";
import { authMiddleware } from "../auth/middleware";
import { getPool } from "../db/client";
import { loadConfig } from "../config";

export const attachmentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authMiddleware);

  app.post("/attachments", async (request, reply) => {
    const { userId } = request.user;
    const config = loadConfig();
    const pool = getPool();

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const metaField = data.fields.meta;
    if (!metaField || typeof metaField !== "object" || !("value" in metaField)) {
      return reply.status(400).send({ error: "Missing meta field" });
    }

    const meta = JSON.parse((metaField as { value: string }).value) as {
      id: string;
      noteId: string;
      type: string;
      filename: string;
      mimeType: string;
      size: number;
      createdAt: number;
    };

    const dir = join(config.attachmentDir, userId);
    await mkdir(dir, { recursive: true });

    const filePath = join(dir, meta.id);
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    await writeFile(filePath, Buffer.concat(chunks));

    await pool.query(
      `INSERT INTO attachments (id, user_id, note_id, type, filename, mime_type, size, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         note_id = EXCLUDED.note_id, filename = EXCLUDED.filename,
         mime_type = EXCLUDED.mime_type, size = EXCLUDED.size`,
      [
        meta.id,
        userId,
        meta.noteId,
        meta.type,
        meta.filename,
        meta.mimeType,
        meta.size,
        meta.createdAt,
      ],
    );

    return reply.status(201).send({ id: meta.id });
  });

  app.get("/attachments/:id", async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };
    const config = loadConfig();
    const pool = getPool();

    const result = await pool.query(
      `SELECT id, mime_type, filename FROM attachments WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: "Attachment not found" });
    }

    const att = result.rows[0];
    const filePath = join(config.attachmentDir, userId, id);

    try {
      const stream = createReadStream(filePath);
      reply.header("Content-Type", att.mime_type);
      reply.header("Content-Disposition", `inline; filename="${att.filename}"`);
      return reply.send(stream);
    } catch {
      return reply.status(404).send({ error: "File not found on disk" });
    }
  });

  app.delete("/attachments/:id", async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };
    const config = loadConfig();
    const pool = getPool();

    const result = await pool.query(
      `DELETE FROM attachments WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: "Attachment not found" });
    }

    const filePath = join(config.attachmentDir, userId, id);
    try {
      await unlink(filePath);
    } catch {}

    return reply.send({ ok: true });
  });
};
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/sync-server typecheck
```

预期：PASS

- [ ] **Step 3: Commit**

```bash
git add packages/sync-server/src/routes/attachments.ts
git commit -m "feat: add attachment upload, download, and delete routes"
```

---

## Task 5: 附件路由测试

**Files:**

- Create: `packages/sync-server/src/routes/attachments.test.ts`

- [ ] **Step 1: 创建 attachments.test.ts**

```ts
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
```

- [ ] **Step 2: 运行测试**

```bash
DATABASE_URL=postgres://notes:notes@localhost:5432/notes_sync JWT_SECRET=test-secret JWT_REFRESH_SECRET=test-refresh-secret ATTACHMENT_DIR=/tmp/sync-server-test-attachments pnpm --filter @notes/sync-server test -- --run src/routes/attachments.test.ts
```

预期：4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/sync-server/src/routes/attachments.test.ts
git commit -m "feat: add attachment route tests"
```

---

## Task 6: 集成路由到 server.ts

**Files:**

- Modify: `packages/sync-server/src/server.ts`

- [ ] **Step 1: 更新 server.ts 注册新路由**

替换 `packages/sync-server/src/server.ts` 为：

```ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import { authRoutes } from "./auth/routes";
import { metadataRoutes } from "./routes/metadata";
import { attachmentRoutes } from "./routes/attachments";
import { loadConfig } from "./config";
import { closePool } from "./db/client";
import { handleConnection } from "./ws/sync-handler";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(websocket);
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

  await app.register(authRoutes, { prefix: "/api/v1" });
  await app.register(metadataRoutes, { prefix: "/api/v1" });
  await app.register(attachmentRoutes, { prefix: "/api/v1" });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ws", { websocket: true }, (socket, request) => {
    handleConnection(socket, { url: request.url });
  });

  const shutdown = async (): Promise<void> => {
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`sync-server listening on port ${config.port}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/sync-server typecheck
```

预期：PASS

- [ ] **Step 3: Commit**

```bash
git add packages/sync-server/src/server.ts
git commit -m "feat: register metadata and attachment routes in server"
```

---

## Task 7: 全局验证

**Files:** 无新增

- [ ] **Step 1: 运行完整验证**

```bash
DATABASE_URL=postgres://notes:notes@localhost:5432/notes_sync JWT_SECRET=test-secret JWT_REFRESH_SECRET=test-refresh-secret ATTACHMENT_DIR=/tmp/sync-server-test-attachments pnpm typecheck && DATABASE_URL=postgres://notes:notes@localhost:5432/notes_sync JWT_SECRET=test-secret JWT_REFRESH_SECRET=test-refresh-secret ATTACHMENT_DIR=/tmp/sync-server-test-attachments pnpm test
```

预期：所有包 typecheck PASS，所有测试 PASS

- [ ] **Step 2: 修复任何问题后 Commit**

```bash
git add -A
git commit -m "fix: resolve P6.3 verification issues"
```
