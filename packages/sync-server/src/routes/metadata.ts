import { type FastifyPluginAsync } from "fastify";
import { unlink } from "fs/promises";
import { join } from "path";
import { authMiddleware } from "../auth/middleware";
import { getPool } from "../db/client";
import { loadConfig } from "../config";

export const metadataRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authMiddleware);

  app.get("/metadata/sync", async (request, reply) => {
    const { userId } = request.user;
    const pool = getPool();

    const [notes, folders, tags, noteTags, attachments] = await Promise.all([
      pool.query(
        `SELECT nm.id, nm.title, nm.folder_id, nm.type, nm.created_at, nm.updated_at, nm.deleted_at, nm.version,
                CASE WHEN nm.user_id = $1 THEN true ELSE false END as is_owner,
                CASE WHEN nm.user_id != $1 THEN s.permission ELSE NULL END as share_permission
         FROM note_metadata nm
         LEFT JOIN shares s ON s.note_id = nm.id AND s.target_user_id = $1 AND s.type = 'user_share'
         WHERE nm.user_id = $1 OR s.target_user_id = $1`,
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
        isOwner: r.is_owner,
        sharePermission: r.share_permission,
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

  app.post("/metadata/batch", { bodyLimit: 10 * 1024 * 1024 }, async (request, reply) => {
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
      deletedAttachmentIds?: string[];
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
        const config = loadConfig();
        const now = Date.now();
        for (const id of body.deletedNoteIds) {
          const attResult = await client.query(
            `SELECT id FROM attachments WHERE note_id = $1 AND user_id = $2`,
            [id, userId],
          );
          for (const row of attResult.rows) {
            const filePath = join(config.attachmentDir, userId, row.id);
            try {
              await unlink(filePath);
            } catch {}
          }
          await client.query(
            `UPDATE note_metadata SET deleted_at = $3, updated_at = $3 WHERE id = $1 AND user_id = $2`,
            [id, userId, now],
          );
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

      if (body.deletedAttachmentIds) {
        const config = loadConfig();
        for (const id of body.deletedAttachmentIds) {
          await client.query(`DELETE FROM attachments WHERE id = $1 AND user_id = $2`, [
            id,
            userId,
          ]);
          const filePath = join(config.attachmentDir, userId, id);
          try {
            await unlink(filePath);
          } catch {}
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
};
