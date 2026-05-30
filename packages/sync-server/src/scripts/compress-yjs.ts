import * as Y from "yjs";
import { getPool, closePool } from "../db/client";

export async function compressAllDocs(): Promise<number> {
  const pool = getPool();
  const docs = await pool.query(
    `SELECT doc_name, COUNT(*) as cnt FROM yjs_updates GROUP BY doc_name HAVING COUNT(*) > 1`,
  );

  let compressed = 0;

  for (const row of docs.rows) {
    const docName = row.doc_name as string;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updates = await client.query(
        `SELECT user_id, update FROM yjs_updates WHERE doc_name = $1 ORDER BY clock ASC`,
        [docName],
      );

      if (updates.rows.length === 0) {
        await client.query("ROLLBACK");
        continue;
      }

      const doc = new Y.Doc();
      for (const u of updates.rows) {
        Y.applyUpdate(doc, new Uint8Array(u.update));
      }

      const stateUpdate = Y.encodeStateAsUpdate(doc);
      const firstUserId = updates.rows[0].user_id;

      await client.query(`DELETE FROM yjs_updates WHERE doc_name = $1`, [docName]);
      await client.query(
        `INSERT INTO yjs_updates (user_id, doc_name, update, clock) VALUES ($1, $2, $3, 1)`,
        [firstUserId, docName, Buffer.from(stateUpdate)],
      );

      await client.query("COMMIT");
      compressed++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Failed to compress ${docName}:`, err);
    } finally {
      client.release();
    }
  }

  return compressed;
}

const isMain = process.argv[1]?.endsWith("compress-yjs");
if (isMain) {
  compressAllDocs()
    .then((count) => {
      console.log(`Compressed ${count} documents.`);
      return closePool();
    })
    .catch((err) => {
      console.error("Compression failed:", err);
      process.exit(1);
    });
}
