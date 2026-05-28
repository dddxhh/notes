import { type FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { hashPassword, verifyPassword } from "../auth/password";
import { authMiddleware } from "../auth/middleware";
import { getPool } from "../db/client";

export const shareRoutes: FastifyPluginAsync = async (app) => {
  app.post("/shares", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const pool = getPool();
    const body = request.body as {
      noteId: string;
      type: "public_link" | "user_share";
      targetUsername?: string;
      permission?: "read" | "write";
      password?: string;
      expiresAt?: string;
    };

    if (!body.noteId || !body.type) {
      return reply.status(400).send({ error: "noteId and type are required" });
    }

    const noteCheck = await pool.query(
      `SELECT id FROM note_metadata WHERE id = $1 AND user_id = $2`,
      [body.noteId, userId],
    );
    if (noteCheck.rows.length === 0) {
      return reply.status(404).send({ error: "Note not found" });
    }

    const id = nanoid();
    let targetUserId: string | null = null;
    let passwordHash: string | null = null;

    if (body.type === "user_share") {
      if (!body.targetUsername) {
        return reply.status(400).send({ error: "targetUsername is required for user_share" });
      }
      const targetUser = await pool.query(`SELECT id FROM users WHERE username = $1`, [
        body.targetUsername,
      ]);
      if (targetUser.rows.length === 0) {
        return reply.status(404).send({ error: "Target user not found" });
      }
      targetUserId = targetUser.rows[0].id;

      if (targetUserId === userId) {
        return reply.status(400).send({ error: "Cannot share with yourself" });
      }
    }

    if (body.type === "public_link" && body.password) {
      passwordHash = await hashPassword(body.password);
    }

    const shareToken = nanoid(24);
    const permission = body.permission ?? "read";
    const expiresAt = body.expiresAt ?? null;

    await pool.query(
      `INSERT INTO shares (id, user_id, note_id, type, target_user_id, permission, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, userId, body.noteId, body.type, targetUserId, permission, passwordHash, expiresAt],
    );

    return reply.status(201).send({
      id,
      noteId: body.noteId,
      type: body.type,
      permission,
      shareToken: body.type === "public_link" ? shareToken : undefined,
      targetUsername: body.targetUsername,
      expiresAt,
    });
  });

  app.get("/shares", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const pool = getPool();

    const result = await pool.query(
      `SELECT s.id, s.note_id, s.type, s.permission, s.target_user_id,
              s.password_hash, s.expires_at, s.created_at,
              u.username as target_username,
              nm.title as note_title
       FROM shares s
       LEFT JOIN users u ON u.id = s.target_user_id
       JOIN note_metadata nm ON nm.id = s.note_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId],
    );

    return reply.send(
      result.rows.map((r: any) => ({
        id: r.id,
        noteId: r.note_id,
        noteTitle: r.note_title,
        type: r.type,
        permission: r.permission,
        targetUsername: r.target_username,
        hasPassword: r.password_hash !== null,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
      })),
    );
  });

  app.delete("/shares/:id", { preHandler: authMiddleware }, async (request, reply) => {
    const { userId } = request.user;
    const { id } = request.params as { id: string };
    const pool = getPool();

    const result = await pool.query(
      `DELETE FROM shares WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: "Share not found" });
    }

    return reply.send({ ok: true });
  });

  app.get("/shares/public/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const pool = getPool();

    const result = await pool.query(
      `SELECT s.*, nm.title, nm.type as note_type, nm.created_at, nm.updated_at
       FROM shares s
       JOIN note_metadata nm ON nm.id = s.note_id
       WHERE s.id = $1 AND s.type = 'public_link'`,
      [token],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: "Share not found" });
    }

    const share = result.rows[0];

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return reply.status(410).send({ error: "Share has expired" });
    }

    const needsPassword = share.password_hash !== null;
    const query = request.query as { password?: string };

    if (needsPassword) {
      if (!query.password) {
        return reply.status(401).send({ error: "Password required", needsPassword: true });
      }
      const valid = await verifyPassword(query.password, share.password_hash);
      if (!valid) {
        return reply.status(401).send({ error: "Invalid password" });
      }
    }

    const docName = `note:${share.note_id}`;
    const { getDocState } = await import("../ws/persistence");
    let mdText = "";
    try {
      const state = await getDocState(docName);
      const Y = await import("yjs");
      const doc = new Y.Doc();
      Y.applyUpdate(doc, state);
      mdText = doc.getText("mdText").toString();
    } catch {}

    return reply.send({
      title: share.title,
      noteType: share.note_type,
      mdText,
      createdAt: share.created_at,
      updatedAt: share.updated_at,
    });
  });
};
