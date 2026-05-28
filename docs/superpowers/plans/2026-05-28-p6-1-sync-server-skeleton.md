# P6.1 — sync-server 骨架 + 认证 + 数据库 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 sync-server 包骨架，实现用户注册/登录/JWT 认证，数据库 schema 就绪。

**Architecture:** Fastify 服务端，PostgreSQL 存储，JWT 认证（access + refresh token）。bcrypt 密码哈希。docker-compose 一键启动开发环境。

**Tech Stack:** Fastify 4, @fastify/websocket, @fastify/cors, pg (node-postgres), bcrypt, jsonwebtoken, vitest, TypeScript 5, Docker Compose

---

## 文件结构

```
packages/sync-server/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── src/
    ├── server.ts               # Fastify 入口，注册插件和路由
    ├── config.ts               # 环境变量读取与校验
    ├── auth/
    │   ├── password.ts         # bcrypt 哈希/验证
    │   ├── token.ts            # JWT 签发/验证
    │   ├── middleware.ts       # Fastify preHandler 认证中间件
    │   └── routes.ts           # /register, /login, /refresh 路由
    └── db/
        ├── schema.sql          # DDL
        ├── migrate.ts          # 迁移脚本（读取 schema.sql 执行）
        └── client.ts           # pg Pool 单例
```

---

## Task 1: 创建 sync-server 包骨架

**Files:**

- Create: `packages/sync-server/package.json`
- Create: `packages/sync-server/tsconfig.json`
- Create: `packages/sync-server/vitest.config.ts`
- Create: `packages/sync-server/.env.example`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@notes/sync-server",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "format": "prettier --write src",
    "format:check": "prettier --check src",
    "migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "fastify": "^4",
    "@fastify/websocket": "^10",
    "@fastify/cors": "^9",
    "@fastify/multipart": "^8",
    "pg": "^8",
    "bcrypt": "^5",
    "jsonwebtoken": "^9",
    "nanoid": "^5"
  },
  "devDependencies": {
    "@types/pg": "^8",
    "@types/bcrypt": "^5",
    "@types/jsonwebtoken": "^9",
    "tsx": "^4",
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

- [ ] **Step 4: 创建 .env.example**

```
DATABASE_URL=postgres://notes:notes@localhost:5432/notes_sync
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-refresh-secret
PORT=3001
ATTACHMENT_DIR=./data/attachments
```

- [ ] **Step 5: 安装依赖**

```bash
pnpm install
```

- [ ] **Step 6: 验证 typecheck 通过**

```bash
pnpm --filter @notes/sync-server typecheck
```

预期：PASS（无源码文件，无错误）

- [ ] **Step 7: Commit**

```bash
git add packages/sync-server/
git commit -m "feat: scaffold sync-server package"
```

---

## Task 2: Docker Compose 开发环境

**Files:**

- Create: `packages/sync-server/docker-compose.yml`
- Create: `packages/sync-server/Dockerfile`

- [ ] **Step 1: 创建 docker-compose.yml**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: notes_sync
      POSTGRES_USER: notes
      POSTGRES_PASSWORD: notes
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: 创建 Dockerfile**

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sync-server/package.json ./packages/sync-server/
RUN pnpm install --frozen-lockfile

COPY packages/sync-server/ ./packages/sync-server/
COPY tsconfig.base.json ./

WORKDIR /app/packages/sync-server
RUN pnpm build

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

- [ ] **Step 3: 启动 PostgreSQL 验证连接**

```bash
cd packages/sync-server && docker compose up -d db
```

等待 3 秒后验证：

```bash
docker compose -f packages/sync-server/docker-compose.yml exec db psql -U notes -d notes_sync -c "SELECT 1"
```

预期：返回 `1`

- [ ] **Step 4: Commit**

```bash
git add packages/sync-server/docker-compose.yml packages/sync-server/Dockerfile
git commit -m "feat: add docker-compose for sync-server dev environment"
```

---

## Task 3: 数据库客户端 + Schema

**Files:**

- Create: `packages/sync-server/src/db/client.ts`
- Create: `packages/sync-server/src/db/schema.sql`
- Create: `packages/sync-server/src/db/migrate.ts`
- Create: `packages/sync-server/src/config.ts`

- [ ] **Step 1: 创建 config.ts**

```ts
export interface Config {
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  port: number;
  attachmentDir: string;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!jwtSecret) throw new Error("JWT_SECRET is required");
  if (!jwtRefreshSecret) throw new Error("JWT_REFRESH_SECRET is required");

  return {
    databaseUrl,
    jwtSecret,
    jwtRefreshSecret,
    port: parseInt(process.env.PORT ?? "3001", 10),
    attachmentDir: process.env.ATTACHMENT_DIR ?? "./data/attachments",
  };
}
```

- [ ] **Step 2: 创建 db/client.ts**

```ts
import pg from "pg";

let pool: pg.Pool | null = null;

export function getPool(databaseUrl?: string): pg.Pool {
  if (!pool) {
    const url = databaseUrl ?? process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    pool = new pg.Pool({ connectionString: url });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
```

- [ ] **Step 3: 创建 db/schema.sql**

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yjs_updates (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  doc_name TEXT NOT NULL,
  update BYTEA NOT NULL,
  clock BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_yjs_doc ON yjs_updates(doc_name, clock);

CREATE TABLE IF NOT EXISTS note_metadata (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  folder_id TEXT,
  type TEXT DEFAULT 'rich',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT REFERENCES note_metadata(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  note_id TEXT REFERENCES note_metadata(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  note_id TEXT REFERENCES note_metadata(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target_user_id TEXT REFERENCES users(id),
  permission TEXT DEFAULT 'read',
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 4: 创建 db/migrate.ts**

```ts
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
```

- [ ] **Step 5: 运行迁移**

```bash
cd packages/sync-server && DATABASE_URL=postgres://notes:notes@localhost:5432/notes_sync pnpm migrate
```

预期：输出 "Running migrations..." 和 "Migrations complete."

- [ ] **Step 6: 验证表已创建**

```bash
docker compose -f packages/sync-server/docker-compose.yml exec db psql -U notes -d notes_sync -c "\dt"
```

预期：列出 users, yjs_updates, note_metadata, folders, tags, note_tags, attachments, shares 共 8 张表

- [ ] **Step 7: Commit**

```bash
git add packages/sync-server/src/config.ts packages/sync-server/src/db/
git commit -m "feat: add database client, schema, and migration script"
```

---

## Task 4: 密码哈希工具 + 测试

**Files:**

- Create: `packages/sync-server/src/auth/password.ts`
- Test: `packages/sync-server/src/auth/password.test.ts`

- [ ] **Step 1: 编写 password.ts 测试**

```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("should hash and verify a password", async () => {
    const password = "my-secure-password-123";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2")).toBe(true);

    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it("should reject wrong password", async () => {
    const hash = await hashPassword("correct-password");
    const valid = await verifyPassword("wrong-password", hash);
    expect(valid).toBe(false);
  });

  it("should produce different hashes for same password", async () => {
    const hash1 = await hashPassword("same-password");
    const hash2 = await hashPassword("same-password");
    expect(hash1).not.toBe(hash2);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm --filter @notes/sync-server test -- --run src/auth/password.test.ts
```

预期：FAIL — `Cannot find module './password'`

- [ ] **Step 3: 实现 password.ts**

```ts
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm --filter @notes/sync-server test -- --run src/auth/password.test.ts
```

预期：3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sync-server/src/auth/password.ts packages/sync-server/src/auth/password.test.ts
git commit -m "feat: add password hashing utility with tests"
```

---

## Task 5: JWT Token 工具 + 测试

**Files:**

- Create: `packages/sync-server/src/auth/token.ts`
- Test: `packages/sync-server/src/auth/token.test.ts`

- [ ] **Step 1: 编写 token.ts 测试**

```ts
import { describe, it, expect } from "vitest";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "./token";

const SECRET = "test-access-secret";
const REFRESH_SECRET = "test-refresh-secret";

describe("token", () => {
  it("should sign and verify access token", () => {
    const token = signAccessToken({ userId: "user-1", username: "alice" }, SECRET);
    const payload = verifyAccessToken(token, SECRET);

    expect(payload.userId).toBe("user-1");
    expect(payload.username).toBe("alice");
  });

  it("should sign and verify refresh token", () => {
    const token = signRefreshToken({ userId: "user-1" }, REFRESH_SECRET);
    const payload = verifyRefreshToken(token, REFRESH_SECRET);

    expect(payload.userId).toBe("user-1");
  });

  it("should reject token with wrong secret", () => {
    const token = signAccessToken({ userId: "user-1", username: "alice" }, SECRET);
    expect(() => verifyAccessToken(token, "wrong-secret")).toThrow();
  });

  it("should reject expired token", () => {
    const token = signAccessToken({ userId: "user-1", username: "alice" }, SECRET, "-1h");
    expect(() => verifyAccessToken(token, SECRET)).toThrow();
  });

  it("should not verify access token with refresh secret", () => {
    const token = signAccessToken({ userId: "user-1", username: "alice" }, SECRET);
    expect(() => verifyRefreshToken(token, REFRESH_SECRET)).toThrow();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm --filter @notes/sync-server test -- --run src/auth/token.test.ts
```

预期：FAIL — `Cannot find module './token'`

- [ ] **Step 3: 实现 token.ts**

```ts
import jwt from "jsonwebtoken";

export interface AccessTokenPayload {
  userId: string;
  username: string;
}

export interface RefreshTokenPayload {
  userId: string;
}

export function signAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  expiresIn: string = "1h",
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function signRefreshToken(
  payload: RefreshTokenPayload,
  secret: string,
  expiresIn: string = "30d",
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & AccessTokenPayload;
  return { userId: decoded.userId, username: decoded.username };
}

export function verifyRefreshToken(token: string, secret: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & RefreshTokenPayload;
  return { userId: decoded.userId };
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm --filter @notes/sync-server test -- --run src/auth/token.test.ts
```

预期：5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sync-server/src/auth/token.ts packages/sync-server/src/auth/token.test.ts
git commit -m "feat: add JWT token signing and verification with tests"
```

---

## Task 6: 认证路由 + 测试

**Files:**

- Create: `packages/sync-server/src/auth/routes.ts`
- Test: `packages/sync-server/src/auth/routes.test.ts`

- [ ] **Step 1: 编写 auth routes 测试**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { authRoutes } from "./routes";
import { getPool, closePool } from "../db/client";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://notes:notes@localhost:5432/notes_sync";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();
  await app.register(authRoutes);
  await app.ready();

  const pool = getPool();
  await pool.query("DELETE FROM users");
});

afterAll(async () => {
  await app.close();
  await closePool();
});

describe("POST /auth/register", () => {
  beforeEach(async () => {
    const pool = getPool();
    await pool.query("DELETE FROM users");
  });

  it("should register a new user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username: "alice", password: "password123" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.username).toBe("alice");
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("should reject duplicate username", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username: "bob", password: "password123" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username: "bob", password: "password456" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("should reject short password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username: "charlie", password: "123" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject empty username", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username: "", password: "password123" },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    const pool = getPool();
    await pool.query("DELETE FROM users");
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username: "alice", password: "password123" },
    });
  });

  it("should login with correct credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "alice", password: "password123" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.username).toBe("alice");
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("should reject wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "alice", password: "wrong" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should reject non-existent user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "nobody", password: "password123" },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("POST /auth/refresh", () => {
  it("should refresh access token", async () => {
    const pool = getPool();
    await pool.query("DELETE FROM users");

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { username: "dave", password: "password123" },
    });
    const { refreshToken } = registerRes.json();

    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeDefined();
  });

  it("should reject invalid refresh token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: "invalid-token" },
    });

    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm --filter @notes/sync-server test -- --run src/auth/routes.test.ts
```

预期：FAIL — `Cannot find module './routes'`

- [ ] **Step 3: 实现 auth/routes.ts**

```ts
import { type FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { hashPassword, verifyPassword } from "./password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./token";
import { getPool } from "../db/client";
import { loadConfig } from "../config";

export const authRoutes: FastifyPluginAsync = async (app) => {
  const config = loadConfig();

  app.post("/auth/register", async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    if (!username || username.trim().length === 0) {
      return reply.status(400).send({ error: "Username is required" });
    }
    if (!password || password.length < 6) {
      return reply.status(400).send({ error: "Password must be at least 6 characters" });
    }

    const pool = getPool();
    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: "Username already exists" });
    }

    const id = nanoid();
    const passwordHash = await hashPassword(password);
    await pool.query("INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)", [
      id,
      username,
      passwordHash,
    ]);

    const accessToken = signAccessToken({ userId: id, username }, config.jwtSecret);
    const refreshToken = signRefreshToken({ userId: id }, config.jwtRefreshSecret);

    return reply.status(201).send({
      user: { id, username },
      accessToken,
      refreshToken,
    });
  });

  app.post("/auth/login", async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    const pool = getPool();
    const result = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username = $1",
      [username],
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const accessToken = signAccessToken(
      { userId: user.id, username: user.username },
      config.jwtSecret,
    );
    const refreshToken = signRefreshToken({ userId: user.id }, config.jwtRefreshSecret);

    return reply.status(200).send({
      user: { id: user.id, username: user.username },
      accessToken,
      refreshToken,
    });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    try {
      const payload = verifyRefreshToken(refreshToken, config.jwtRefreshSecret);
      const pool = getPool();
      const result = await pool.query("SELECT id, username FROM users WHERE id = $1", [
        payload.userId,
      ]);

      if (result.rows.length === 0) {
        return reply.status(401).send({ error: "User not found" });
      }

      const user = result.rows[0];
      const accessToken = signAccessToken(
        { userId: user.id, username: user.username },
        config.jwtSecret,
      );

      return reply.status(200).send({ accessToken });
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
  });
};
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm --filter @notes/sync-server test -- --run src/auth/routes.test.ts
```

预期：9 tests PASS（需要 PostgreSQL 运行中）

- [ ] **Step 5: Commit**

```bash
git add packages/sync-server/src/auth/routes.ts packages/sync-server/src/auth/routes.test.ts
git commit -m "feat: add auth routes (register, login, refresh) with tests"
```

---

## Task 7: JWT 认证中间件 + 测试

**Files:**

- Create: `packages/sync-server/src/auth/middleware.ts`
- Test: `packages/sync-server/src/auth/middleware.test.ts`

- [ ] **Step 1: 编写 middleware 测试**

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { authMiddleware } from "./middleware";
import { signAccessToken } from "./token";

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://notes:notes@localhost:5432/notes_sync";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

const SECRET = "test-secret";

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify();

  app.get("/protected", { preHandler: authMiddleware }, async (request) => {
    return { userId: (request as any).user.userId, username: (request as any).user.username };
  });

  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("authMiddleware", () => {
  it("should allow valid token", async () => {
    const token = signAccessToken({ userId: "u1", username: "alice" }, SECRET);
    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().userId).toBe("u1");
    expect(res.json().username).toBe("alice");
  });

  it("should reject missing authorization header", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/protected",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should reject invalid token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer invalid-token" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should reject non-Bearer scheme", async () => {
    const token = signAccessToken({ userId: "u1", username: "alice" }, SECRET);
    const res = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: `Basic ${token}` },
    });

    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
pnpm --filter @notes/sync-server test -- --run src/auth/middleware.test.ts
```

预期：FAIL — `Cannot find module './middleware'`

- [ ] **Step 3: 实现 auth/middleware.ts**

```ts
import { type FastifyRequest, type FastifyReply } from "fastify";
import { verifyAccessToken } from "./token";
import { loadConfig } from "../config";

declare module "fastify" {
  interface FastifyRequest {
    user: { userId: string; username: string };
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const config = loadConfig();

  try {
    const payload = verifyAccessToken(token, config.jwtSecret);
    request.user = payload;
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
pnpm --filter @notes/sync-server test -- --run src/auth/middleware.test.ts
```

预期：4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/sync-server/src/auth/middleware.ts packages/sync-server/src/auth/middleware.test.ts
git commit -m "feat: add JWT auth middleware with tests"
```

---

## Task 8: Fastify 服务器入口

**Files:**

- Create: `packages/sync-server/src/server.ts`

- [ ] **Step 1: 实现 server.ts**

```ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import { authRoutes } from "./auth/routes";
import { loadConfig } from "./config";
import { closePool } from "./db/client";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(authRoutes, { prefix: "/api/v1" });

  app.get("/health", async () => ({ status: "ok" }));

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

- [ ] **Step 2: 启动服务器验证**

```bash
cd packages/sync-server && DATABASE_URL=postgres://notes:notes@localhost:5432/notes_sync JWT_SECRET=test-secret JWT_REFRESH_SECRET=test-refresh-secret pnpm dev
```

在另一个终端测试：

```bash
curl http://localhost:3001/health
```

预期：`{"status":"ok"}`

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

预期：返回 201 + JSON 包含 user, accessToken, refreshToken

- [ ] **Step 3: 停止服务器，Commit**

```bash
git add packages/sync-server/src/server.ts
git commit -m "feat: add Fastify server entry point with health check"
```

---

## Task 9: 全局验证 — typecheck + lint + test

**Files:** 无新增

- [ ] **Step 1: 运行完整验证**

```bash
pnpm --filter @notes/sync-server typecheck && pnpm --filter @notes/sync-server test
```

预期：typecheck PASS，所有测试 PASS

- [ ] **Step 2: 运行 monorepo 全局验证**

```bash
pnpm typecheck && pnpm test
```

预期：所有包（core, web, sync-server）均通过

- [ ] **Step 3: 修复任何问题后 Commit**

```bash
git add -A
git commit -m "fix: resolve P6.1 verification issues"
```
