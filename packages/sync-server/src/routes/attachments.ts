import { type FastifyPluginAsync } from "fastify";
import "@fastify/multipart";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join } from "path";
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

    if (!meta.noteId) {
      return reply.status(400).send({ error: "Missing noteId" });
    }

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
      `SELECT a.id, a.mime_type, a.filename, a.user_id as owner_id
       FROM attachments a
       WHERE a.id = $1 AND (
         a.user_id = $2
         OR EXISTS (
           SELECT 1 FROM shares s
           WHERE s.note_id = a.note_id
             AND s.target_user_id = $2
             AND s.type = 'user_share'
         )
       )`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: "Attachment not found" });
    }

    const att = result.rows[0];
    const filePath = join(config.attachmentDir, att.owner_id, id);

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
