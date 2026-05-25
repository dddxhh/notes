import SQLiteESMFactory from "wa-sqlite/dist/wa-sqlite-async.mjs";
import * as SQLite from "wa-sqlite";
import { IDBBatchAtomicVFS } from "wa-sqlite/src/examples/IDBBatchAtomicVFS.js";

const DB_NAME = "notes";
const VFS_NAME = "notes-vfs";

const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  content_json TEXT NOT NULL DEFAULT '',
  md_text TEXT NOT NULL DEFAULT '',
  folder_id TEXT REFERENCES folders(id),
  type TEXT NOT NULL DEFAULT 'rich',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1
)`,
  `CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
)`,
  `CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
)`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id)`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id)`,
];

const FTS5_DDL = `
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title,
  content_json,
  md_text,
  content=notes
);
`;

type SQLiteAPI = ReturnType<typeof SQLite.Factory>;
type SQLiteCompatibleType = number | string | Uint8Array | Array<number> | bigint | null;

let globalDb: number | null = null;
let globalApi: SQLiteAPI | null = null;
let globalVfs: IDBBatchAtomicVFS | null = null;

export interface SQLiteDB {
  sqlite3: SQLiteAPI;
  db: number;
  vfs: IDBBatchAtomicVFS;
}

export async function initSQLite(dbName?: string): Promise<SQLiteDB> {
  const module = await SQLiteESMFactory();
  const sqlite3 = SQLite.Factory(module);

  const vfs = new IDBBatchAtomicVFS(VFS_NAME);
  sqlite3.vfs_register(vfs as unknown as SQLiteVFS, true);

  const db = await sqlite3.open_v2(
    dbName ?? DB_NAME,
    SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_READWRITE,
    VFS_NAME,
  );

  for (const stmt of DDL_STATEMENTS) {
    await sqlite3.run(db, stmt);
  }
  try {
    await sqlite3.exec(db, FTS5_DDL);
  } catch (_e) {
    // FTS5 not available, skip
  }

  globalDb = db;
  globalApi = sqlite3;
  globalVfs = vfs;

  return { sqlite3, db, vfs };
}

export async function closeSQLite(sqliteDB?: SQLiteDB): Promise<void> {
  if (sqliteDB) {
    await sqliteDB.sqlite3.close(sqliteDB.db);
    await sqliteDB.vfs.close();
  } else if (globalDb !== null && globalApi !== null) {
    await globalApi.close(globalDb);
    if (globalVfs) await globalVfs.close();
    globalDb = null;
    globalApi = null;
    globalVfs = null;
  }
}

export function getDB(): number {
  if (globalDb === null) throw new Error("SQLite database not initialized");
  return globalDb;
}

export function getApi(): SQLiteAPI {
  if (globalApi === null) throw new Error("SQLite API not initialized");
  return globalApi;
}

export async function runSQL(
  sqliteDB: SQLiteDB,
  sql: string,
  params?: SQLiteCompatibleType[],
): Promise<void> {
  await sqliteDB.sqlite3.run(sqliteDB.db, sql, params);
}

export async function querySQL<T = Record<string, SQLiteCompatibleType>>(
  sqliteDB: SQLiteDB,
  sql: string,
  params?: SQLiteCompatibleType[],
): Promise<T[]> {
  const result = await sqliteDB.sqlite3.execWithParams(sqliteDB.db, sql, params);
  if (!result.rows.length) return [];

  const rows: T[] = [];
  for (const row of result.rows) {
    const obj: Record<string, SQLiteCompatibleType> = {};
    for (let i = 0; i < result.columns.length; i++) {
      obj[result.columns[i]] = row[i] as SQLiteCompatibleType;
    }
    rows.push(obj as T);
  }
  return rows;
}
