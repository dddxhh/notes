import * as Y from "yjs";
import { getPool } from "../db/client";

export async function storeUpdate(
  docName: string,
  update: Uint8Array,
  userId: string,
): Promise<void> {
  const pool = getPool();
  const buffer = Buffer.from(update);
  await pool.query(
    `INSERT INTO yjs_updates (user_id, doc_name, update, clock)
     VALUES ($1, $2, $3, (SELECT COALESCE(MAX(clock), 0) + 1 FROM yjs_updates WHERE doc_name = $2))`,
    [userId, docName, buffer],
  );
}

export async function getDocUpdates(docName: string): Promise<Uint8Array[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT update FROM yjs_updates WHERE doc_name = $1 ORDER BY clock ASC`,
    [docName],
  );
  return result.rows.map((row: { update: Buffer }) => new Uint8Array(row.update));
}

export async function getDocState(docName: string): Promise<Uint8Array> {
  const updates = await getDocUpdates(docName);
  const doc = new Y.Doc();
  for (const update of updates) {
    Y.applyUpdate(doc, update);
  }
  return Uint8Array.from(Y.encodeStateAsUpdate(doc));
}

export async function clearDocUpdates(docName: string): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM yjs_updates WHERE doc_name = $1`, [docName]);
}
