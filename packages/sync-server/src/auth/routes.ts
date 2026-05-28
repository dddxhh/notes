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
