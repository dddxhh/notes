import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { authRoutes } from "./routes";
import { getPool, closePool } from "../db/client";
import pg from "pg";

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

if (!dbAvailable) {
  console.log("PostgreSQL not available, skipping auth route tests");
}

let app: FastifyInstance;

beforeAll(async () => {
  if (!dbAvailable) return;

  app = Fastify();
  await app.register(authRoutes);
  await app.ready();

  const pool = getPool();
  await pool.query("DELETE FROM users WHERE username IN ('alice', 'bob', 'charlie', 'dave')");
});

afterAll(async () => {
  if (!dbAvailable) return;
  const pool = getPool();
  await pool.query("DELETE FROM users WHERE username IN ('alice', 'bob', 'charlie', 'dave')");
  await app?.close();
  await closePool();
});

describe.skipIf(!dbAvailable)("POST /auth/register", () => {
  beforeEach(async () => {
    const pool = getPool();
    await pool.query("DELETE FROM users WHERE username IN ('alice', 'bob', 'charlie', 'dave')");
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

describe.skipIf(!dbAvailable)("POST /auth/login", () => {
  beforeEach(async () => {
    const pool = getPool();
    await pool.query("DELETE FROM users WHERE username IN ('alice', 'bob', 'charlie', 'dave')");
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

describe.skipIf(!dbAvailable)("POST /auth/refresh", () => {
  it("should refresh access token", async () => {
    const pool = getPool();
    await pool.query("DELETE FROM users WHERE username IN ('alice', 'bob', 'charlie', 'dave')");

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
