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
    return { userId: request.user.userId, username: request.user.username };
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
