import SQLiteESMFactory from "wa-sqlite/dist/wa-sqlite-async.mjs";
import * as SQLite from "wa-sqlite";

let db: number | null = null;
let api: SQLiteAPI | null = null;

type SQLiteAPI = ReturnType<typeof SQLite.Factory>;

const DDL = `
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT,
  content_json TEXT DEFAULT '',
  md_text TEXT DEFAULT '',
  folder_id TEXT REFERENCES folders(id),
  type TEXT DEFAULT 'rich',
  created_at INTEGER,
  updated_at INTEGER,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  type TEXT,
  filename TEXT,
  mime_type TEXT,
  size INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title, content, content=notes, content_rowid=rowid, tokenize=simple
);

CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id);
`;

export async function initSQLite(): Promise<number> {
  const module = await SQLiteESMFactory();
  api = SQLite.Factory(module);
  db = await api.open_v2("notes.db");
  await api.exec(db, DDL);
  return db;
}

export async function closeSQLite(): Promise<void> {
  if (db !== null && api !== null) {
    await api.close(db);
    db = null;
    api = null;
  }
}

export function getDB(): number {
  if (db === null) {
    throw new Error("SQLite database not initialized");
  }
  return db;
}

export function getApi(): SQLiteAPI {
  if (api === null) {
    throw new Error("SQLite API not initialized");
  }
  return api;
}