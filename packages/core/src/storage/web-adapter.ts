import { StorageAdapter } from "./adapter";
import { initSQLite, closeSQLite, runSQL, querySQL, SQLiteDB } from "./sqlite";
import {
  initIndexedDB,
  closeIndexedDB,
  saveBlob,
  getBlob,
  saveThumbnail,
  getThumbnail,
  deleteBlob,
  generateImageThumbnail,
} from "./indexeddb";
import { searchNotes } from "../search/fts5";
import {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
  Attachment,
  AttachmentType,
  Tag,
  SearchInput,
  SearchResult,
} from "../models";
import { generateId } from "../utils";

type Row = Record<string, number | string | null>;

export class WebStorageAdapter implements StorageAdapter {
  private sqliteDB: SQLiteDB | null = null;
  private idbInitialized = false;

  async init(): Promise<void> {
    this.sqliteDB = await initSQLite();
    await initIndexedDB();
    this.idbInitialized = true;
  }

  async close(): Promise<void> {
    if (this.sqliteDB) {
      await closeSQLite(this.sqliteDB);
      this.sqliteDB = null;
    }
    if (this.idbInitialized) {
      closeIndexedDB();
      this.idbInitialized = false;
    }
  }

  private getDB(): SQLiteDB {
    if (!this.sqliteDB) throw new Error("Database not initialized");
    return this.sqliteDB;
  }

  async createNote(input: CreateNoteInput): Promise<Note> {
    const id = generateId();
    const now = Date.now();
    const db = this.getDB();
    await runSQL(
      db,
      `INSERT INTO notes (id, title, content_json, md_text, folder_id, type, created_at, updated_at, deleted_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)`,
      [
        id,
        input.title,
        input.contentJson ?? "",
        input.mdText ?? "",
        input.folderId ?? null,
        input.type ?? "rich",
        now,
        now,
      ],
    );
    return {
      id,
      title: input.title,
      contentJson: input.contentJson ?? "",
      mdText: input.mdText ?? "",
      folderId: input.folderId ?? null,
      type: input.type ?? "rich",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    };
  }

  async updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
    const db = this.getDB();
    const rows = await querySQL<Row>(db, `SELECT * FROM notes WHERE id=?`, [id]);
    if (!rows.length) throw new Error(`Note ${id} not found`);
    const existing = mapNoteRow(rows[0]);

    const title = input.title ?? existing.title;
    const contentJson = input.contentJson ?? existing.contentJson;
    const mdText = input.mdText ?? existing.mdText;
    const folderId = input.folderId !== undefined ? input.folderId : existing.folderId;
    const type = input.type ?? existing.type;
    const deletedAt = input.deletedAt !== undefined ? input.deletedAt : existing.deletedAt;
    const now = Date.now();
    const version = existing.version + 1;

    await runSQL(
      db,
      `UPDATE notes SET title=?, content_json=?, md_text=?, folder_id=?, type=?, updated_at=?, deleted_at=?, version=? WHERE id=?`,
      [title, contentJson, mdText, folderId, type, now, deletedAt, version, id],
    );

    await runSQL(db, `INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);

    return {
      ...existing,
      title,
      contentJson,
      mdText,
      folderId,
      type,
      updatedAt: now,
      deletedAt,
      version,
    };
  }

  async deleteNote(id: string): Promise<void> {
    const db = this.getDB();
    const now = Date.now();
    await runSQL(db, `UPDATE notes SET deleted_at=?, updated_at=? WHERE id=?`, [now, now, id]);
    await runSQL(db, `INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);
  }

  async permanentlyDeleteNote(id: string): Promise<void> {
    const db = this.getDB();
    await runSQL(db, `DELETE FROM note_tags WHERE note_id=?`, [id]);
    await runSQL(db, `DELETE FROM attachments WHERE note_id=?`, [id]);
    await runSQL(db, `DELETE FROM notes WHERE id=?`, [id]);
    await runSQL(db, `INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);
  }

  async getNote(id: string): Promise<Note | null> {
    const db = this.getDB();
    const rows = await querySQL<Row>(db, `SELECT * FROM notes WHERE id=?`, [id]);
    if (!rows.length) return null;
    return mapNoteRow(rows[0]);
  }

  async listNotes(folderId?: string, tagId?: string): Promise<Note[]> {
    const db = this.getDB();
    let sql = `SELECT * FROM notes WHERE deleted_at IS NULL`;
    const params: (string | number | null)[] = [];

    if (folderId) {
      sql += ` AND folder_id=?`;
      params.push(folderId);
    }
    if (tagId) {
      sql += ` AND EXISTS(SELECT 1 FROM note_tags WHERE note_tags.note_id=notes.id AND note_tags.tag_id=?)`;
      params.push(tagId);
    }
    sql += ` ORDER BY updated_at DESC`;

    const rows = await querySQL<Row>(db, sql, params);
    return rows.map(mapNoteRow);
  }

  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const id = generateId();
    const now = Date.now();
    const db = this.getDB();
    await runSQL(
      db,
      `INSERT INTO folders (id, name, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.parentId ?? null, input.sortOrder ?? 0, now, now],
    );
    return {
      id,
      name: input.name,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updateFolder(id: string, input: UpdateFolderInput): Promise<Folder> {
    const db = this.getDB();
    const rows = await querySQL<Row>(db, `SELECT * FROM folders WHERE id=?`, [id]);
    if (!rows.length) throw new Error(`Folder ${id} not found`);

    const existing = rows[0];
    const name = input.name ?? (existing.name as string);
    const parentId =
      input.parentId !== undefined ? input.parentId : (existing.parent_id as string | null);
    const sortOrder = input.sortOrder ?? (existing.sort_order as number);
    const now = Date.now();

    await runSQL(
      db,
      `UPDATE folders SET name=?, parent_id=?, sort_order=?, updated_at=? WHERE id=?`,
      [name, parentId, sortOrder, now, id],
    );

    return {
      id,
      name,
      parentId,
      sortOrder,
      createdAt: existing.created_at as number,
      updatedAt: now,
    };
  }

  async deleteFolder(id: string): Promise<void> {
    const db = this.getDB();
    await runSQL(db, `DELETE FROM folders WHERE id=?`, [id]);
  }

  async listFolders(parentId?: string | null): Promise<Folder[]> {
    const db = this.getDB();
    let sql = `SELECT * FROM folders`;
    const params: (string | number | null)[] = [];

    if (parentId === null) {
      sql += ` WHERE parent_id IS NULL`;
    } else if (parentId !== undefined) {
      sql += ` WHERE parent_id=?`;
      params.push(parentId);
    }
    sql += ` ORDER BY sort_order ASC, name ASC`;

    const rows = await querySQL<Row>(db, sql, params);
    return rows.map(mapFolderRow);
  }

  async saveAttachment(noteId: string, file: File, type: AttachmentType): Promise<Attachment> {
    const id = generateId();
    const now = Date.now();
    const db = this.getDB();

    await runSQL(
      db,
      `INSERT INTO attachments (id, note_id, type, filename, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, noteId, type, file.name, file.type, file.size, now],
    );

    await saveBlob(id, file);

    if (type === "image") {
      try {
        const thumbnail = await generateImageThumbnail(file);
        await saveThumbnail(id, thumbnail);
      } catch (_e) {
        // thumbnail generation failed, skip
      }
    }

    return {
      id,
      noteId,
      type,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      createdAt: now,
    };
  }

  async getAttachmentBlob(id: string): Promise<Blob | null> {
    return getBlob(id);
  }

  async getAttachmentThumbnail(id: string): Promise<Blob | null> {
    return getThumbnail(id);
  }

  async deleteAttachment(id: string): Promise<void> {
    const db = this.getDB();
    await runSQL(db, `DELETE FROM attachments WHERE id=?`, [id]);
    await deleteBlob(id);
  }

  async listAttachmentIds(): Promise<string[]> {
    const db = this.getDB();
    const rows = await querySQL<Row>(db, `SELECT id FROM attachments`);
    return rows.map((r) => r.id as string);
  }

  async searchNotes(input: SearchInput): Promise<SearchResult> {
    return searchNotes(this.getDB(), input);
  }

  async createTag(name: string): Promise<Tag> {
    const db = this.getDB();
    const existing = await querySQL<Row>(db, `SELECT id, name FROM tags WHERE name=?`, [name]);
    if (existing.length > 0) {
      return { id: existing[0].id as string, name: existing[0].name as string };
    }
    const id = generateId();
    await runSQL(db, `INSERT INTO tags (id, name) VALUES (?, ?)`, [id, name]);
    return { id, name };
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    await runSQL(this.getDB(), `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, [
      noteId,
      tagId,
    ]);
  }

  async addTagsToNote(noteId: string, tagIds: string[]): Promise<void> {
    const db = this.getDB();
    for (const tagId of tagIds) {
      await runSQL(db, `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, [noteId, tagId]);
    }
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await runSQL(this.getDB(), `DELETE FROM note_tags WHERE note_id=? AND tag_id=?`, [
      noteId,
      tagId,
    ]);
  }

  async removeTagsFromNote(noteId: string, tagIds: string[]): Promise<void> {
    const db = this.getDB();
    for (const tagId of tagIds) {
      await runSQL(db, `DELETE FROM note_tags WHERE note_id=? AND tag_id=?`, [noteId, tagId]);
    }
  }

  async getTagsForNote(noteId: string): Promise<Tag[]> {
    const rows = await querySQL<Row>(
      this.getDB(),
      `SELECT t.id, t.name FROM tags t INNER JOIN note_tags nt ON t.id=nt.tag_id WHERE nt.note_id=?`,
      [noteId],
    );
    return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
  }

  async listTags(): Promise<Tag[]> {
    const rows = await querySQL<Row>(this.getDB(), `SELECT id, name FROM tags ORDER BY name ASC`);
    return rows.map((r) => ({ id: r.id as string, name: r.name as string }));
  }

  async deleteTag(id: string): Promise<void> {
    const db = this.getDB();
    await runSQL(db, `DELETE FROM note_tags WHERE tag_id=?`, [id]);
    await runSQL(db, `DELETE FROM tags WHERE id=?`, [id]);
  }

  async getNotesForTag(tagId: string): Promise<Note[]> {
    const db = this.getDB();
    const rows = await querySQL<Row>(
      db,
      `SELECT notes.* FROM notes INNER JOIN note_tags ON notes.id=note_tags.note_id WHERE note_tags.tag_id=? AND notes.deleted_at IS NULL`,
      [tagId],
    );
    return rows.map(mapNoteRow);
  }

  async updateNotesFolderId(oldFolderId: string, newFolderId: string | null): Promise<void> {
    const db = this.getDB();
    await runSQL(
      db,
      `UPDATE notes SET folder_id=?, updated_at=? WHERE folder_id=? AND deleted_at IS NULL`,
      [newFolderId, Date.now(), oldFolderId],
    );
  }

  async softDeleteNotesByFolder(folderId: string): Promise<void> {
    const db = this.getDB();
    await runSQL(
      db,
      `UPDATE notes SET deleted_at=?, updated_at=? WHERE folder_id=? AND deleted_at IS NULL`,
      [Date.now(), Date.now(), folderId],
    );
    await runSQL(db, `INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);
  }
}

function mapNoteRow(row: Row): Note {
  return {
    id: row.id as string,
    title: row.title as string,
    contentJson: row.content_json as string,
    mdText: row.md_text as string,
    folderId: row.folder_id as string | null,
    type: row.type as Note["type"],
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
    deletedAt: row.deleted_at as number | null,
    version: row.version as number,
  };
}

function mapFolderRow(row: Row): Folder {
  return {
    id: row.id as string,
    name: row.name as string,
    parentId: row.parent_id as string | null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
