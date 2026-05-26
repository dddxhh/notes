import type { StorageAdapter } from "@notes/core";
import {
  initIndexedDB,
  closeIndexedDB,
  saveBlob,
  getBlob,
  saveThumbnail,
  getThumbnail,
  deleteBlob,
  generateImageThumbnail,
} from "@notes/core";
import type {
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
} from "@notes/core";
import { generateId } from "@notes/core";

export interface SqlRequest {
  id: string;
  type: "init" | "close" | "query" | "run";
  sql?: string;
  params?: unknown[];
}

export interface SqlResponse {
  id: string;
  type: "init-result" | "close-result" | "query-result" | "run-result";
  rows?: unknown[];
  error?: string;
}

export interface DataChangeNotification {
  type: "data-change";
  tables: string[];
}

export interface SQLExecutor {
  init(): Promise<void>;
  close(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<unknown[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
}

export class WriteLock {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }
}

export function isWriteOperation(sql: string): boolean {
  const normalized = sql.trimStart().toUpperCase();
  const prefixes = ["INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP", "REPLACE"];
  return prefixes.some((p) => normalized.startsWith(p));
}

export function extractTableName(sql: string): string | null {
  const patterns: Array<[RegExp, number]> = [
    [/INSERT\s+INTO\s+(\w+)/i, 1],
    [/UPDATE\s+(\w+)/i, 1],
    [/DELETE\s+FROM\s+(\w+)/i, 1],
    [/CREATE\s+(?:VIRTUAL\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i, 1],
    [/ALTER\s+TABLE\s+(\w+)/i, 1],
    [/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)/i, 1],
  ];
  for (const [pattern, group] of patterns) {
    const match = sql.match(pattern);
    if (match) return match[group];
  }
  return null;
}

export class SharedWorkerSQLiteHandler {
  private writeLock = new WriteLock();
  private executor: SQLExecutor | null = null;
  private broadcastFn: ((notification: DataChangeNotification) => void) | null = null;
  private initialized = false;

  constructor(executor?: SQLExecutor) {
    if (executor) this.executor = executor;
  }

  setExecutor(executor: SQLExecutor): void {
    this.executor = executor;
  }

  setBroadcastFn(fn: (notification: DataChangeNotification) => void): void {
    this.broadcastFn = fn;
  }

  async handleRequest(request: SqlRequest): Promise<SqlResponse> {
    try {
      switch (request.type) {
        case "init": {
          if (!this.executor) throw new Error("No executor set");
          await this.executor.init();
          this.initialized = true;
          return { id: request.id, type: "init-result" };
        }
        case "close": {
          if (!this.executor) throw new Error("No executor set");
          await this.executor.close();
          this.initialized = false;
          return { id: request.id, type: "close-result" };
        }
        case "query": {
          if (!this.initialized) {
            return { id: request.id, type: "query-result", error: "Database not initialized" };
          }
          const rows = await this.executor!.query(request.sql!, request.params);
          return { id: request.id, type: "query-result", rows };
        }
        case "run": {
          if (!this.initialized) {
            return { id: request.id, type: "run-result", error: "Database not initialized" };
          }
          const sql = request.sql!;
          if (isWriteOperation(sql)) {
            await this.writeLock.acquire();
            try {
              await this.executor!.run(sql, request.params);
              if (this.broadcastFn) {
                const table = extractTableName(sql);
                if (table) {
                  this.broadcastFn({
                    type: "data-change",
                    tables: [table],
                  });
                }
              }
            } finally {
              this.writeLock.release();
            }
          } else {
            await this.executor!.run(sql, request.params);
          }
          return { id: request.id, type: "run-result" };
        }
        default:
          return {
            id: request.id,
            type: `${request.type}-result`,
            error: `Unknown request type: ${request.type}`,
          };
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        id: request.id,
        type: `${request.type}-result`,
        error: message,
      };
    }
  }
}

export class SharedWorkerSQLiteClient {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private pending = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
  >();
  private broadcastChannel: BroadcastChannel | null = null;
  private changeListeners: Array<(tables: string[]) => void> = [];
  private initialized = false;
  private requestIdCounter = 0;

  static isAvailable(): boolean {
    return typeof SharedWorker !== "undefined";
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    this.worker = new SharedWorker(new URL("./sqlite-worker.ts", import.meta.url), {
      type: "module",
    });
    this.port = this.worker.port;
    this.port.start();

    this.port.onmessage = (e: MessageEvent) => {
      const response: SqlResponse = e.data;
      const pending = this.pending.get(response.id);
      if (pending) {
        this.pending.delete(response.id);
        if (response.error) {
          pending.reject(new Error(response.error));
        } else {
          pending.resolve(response.rows ?? undefined);
        }
      }
    };

    await this.sendRequest({ type: "init" });

    this.broadcastChannel = new BroadcastChannel("notes-sqlite-changes");
    this.broadcastChannel.onmessage = (e: MessageEvent) => {
      const notification: DataChangeNotification = e.data;
      if (notification.type === "data-change") {
        for (const listener of this.changeListeners) {
          listener(notification.tables);
        }
      }
    };

    this.initialized = true;
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
    const result = await this.sendRequest({
      type: "query",
      sql,
      params,
    });
    return (result as T[]) ?? [];
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    await this.sendRequest({ type: "run", sql, params });
  }

  async close(): Promise<void> {
    if (!this.initialized) return;
    await this.sendRequest({ type: "close" });
    if (this.port) this.port.close();
    if (this.broadcastChannel) this.broadcastChannel.close();
    this.broadcastChannel = null;
    this.port = null;
    this.worker = null;
    this.initialized = false;
  }

  onDataChange(listener: (tables: string[]) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index >= 0) this.changeListeners.splice(index, 1);
    };
  }

  private sendRequest(request: Omit<SqlRequest, "id">): Promise<unknown> {
    const id = String(++this.requestIdCounter);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.port!.postMessage({ id, ...request });
    });
  }
}

type Row = Record<string, number | string | null>;

export class SharedWorkerStorageAdapter implements StorageAdapter {
  private client: SharedWorkerSQLiteClient;
  private idbInitialized = false;

  constructor(client: SharedWorkerSQLiteClient) {
    this.client = client;
  }

  async init(): Promise<void> {
    await this.client.init();
    await initIndexedDB();
    this.idbInitialized = true;
  }

  async close(): Promise<void> {
    await this.client.close();
    if (this.idbInitialized) {
      closeIndexedDB();
      this.idbInitialized = false;
    }
  }

  async createNote(input: CreateNoteInput): Promise<Note> {
    const id = generateId();
    const now = Date.now();
    await this.client.run(
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
    const rows = await this.client.query<Row>(`SELECT * FROM notes WHERE id=?`, [id]);
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

    await this.client.run(
      `UPDATE notes SET title=?, content_json=?, md_text=?, folder_id=?, type=?, updated_at=?, deleted_at=?, version=? WHERE id=?`,
      [title, contentJson, mdText, folderId, type, now, deletedAt, version, id],
    );

    await this.client.run(`INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);

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
    const now = Date.now();
    await this.client.run(`UPDATE notes SET deleted_at=?, updated_at=? WHERE id=?`, [now, now, id]);
    await this.client.run(`INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);
  }

  async permanentlyDeleteNote(id: string): Promise<void> {
    await this.client.run(`DELETE FROM note_tags WHERE note_id=?`, [id]);
    await this.client.run(`DELETE FROM attachments WHERE note_id=?`, [id]);
    await this.client.run(`DELETE FROM notes WHERE id=?`, [id]);
    await this.client.run(`INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);
  }

  async getNote(id: string): Promise<Note | null> {
    const rows = await this.client.query<Row>(`SELECT * FROM notes WHERE id=?`, [id]);
    if (!rows.length) return null;
    return mapNoteRow(rows[0]);
  }

  async listNotes(folderId?: string, tagId?: string): Promise<Note[]> {
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

    const rows = await this.client.query<Row>(sql, params);
    return rows.map(mapNoteRow);
  }

  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const id = generateId();
    const now = Date.now();
    await this.client.run(
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
    const rows = await this.client.query<Row>(`SELECT * FROM folders WHERE id=?`, [id]);
    if (!rows.length) throw new Error(`Folder ${id} not found`);

    const existing = rows[0];
    const name = input.name ?? (existing.name as string);
    const parentId =
      input.parentId !== undefined ? input.parentId : (existing.parent_id as string | null);
    const sortOrder = input.sortOrder ?? (existing.sort_order as number);
    const now = Date.now();

    await this.client.run(
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
    await this.client.run(`DELETE FROM folders WHERE id=?`, [id]);
  }

  async listFolders(parentId?: string | null): Promise<Folder[]> {
    let sql = `SELECT * FROM folders`;
    const params: (string | number | null)[] = [];

    if (parentId === null) {
      sql += ` WHERE parent_id IS NULL`;
    } else if (parentId !== undefined) {
      sql += ` WHERE parent_id=?`;
      params.push(parentId);
    }
    sql += ` ORDER BY sort_order ASC, name ASC`;

    const rows = await this.client.query<Row>(sql, params);
    return rows.map(mapFolderRow);
  }

  async saveAttachment(noteId: string, file: File, type: AttachmentType): Promise<Attachment> {
    const id = generateId();
    const now = Date.now();

    await this.client.run(
      `INSERT INTO attachments (id, note_id, type, filename, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, noteId, type, file.name, file.type, file.size, now],
    );

    await saveBlob(id, file);

    if (type === "image") {
      try {
        const thumbnail = await generateImageThumbnail(file);
        await saveThumbnail(id, thumbnail);
      } catch {}
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
    await this.client.run(`DELETE FROM attachments WHERE id=?`, [id]);
    await deleteBlob(id);
  }

  async listAttachmentIds(): Promise<string[]> {
    const rows = await this.client.query<Row>(`SELECT id FROM attachments`);
    return rows.map((r) => r.id as string);
  }

  async searchNotes(input: SearchInput): Promise<SearchResult> {
    const conditions: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.includeDeleted !== true) {
      conditions.push("notes.deleted_at IS NULL");
    }

    if (input.query) {
      conditions.push("notes.rowid IN (SELECT rowid FROM notes_fts WHERE notes_fts MATCH ?)");
      params.push(input.query);
    }

    if (input.folderId) {
      conditions.push("notes.folder_id = ?");
      params.push(input.folderId);
    }

    if (input.type) {
      conditions.push("notes.type = ?");
      params.push(input.type);
    }

    if (input.tagIds && input.tagIds.length > 0) {
      if (input.tagMode === "intersection") {
        for (const tagId of input.tagIds) {
          conditions.push(
            "EXISTS(SELECT 1 FROM note_tags WHERE note_tags.note_id=notes.id AND note_tags.tag_id=?)",
          );
          params.push(tagId);
        }
      } else {
        const placeholders = input.tagIds.map(() => "?").join(",");
        conditions.push(
          `EXISTS(SELECT 1 FROM note_tags WHERE note_tags.note_id=notes.id AND note_tags.tag_id IN (${placeholders}))`,
        );
        params.push(...input.tagIds);
      }
    }

    if (input.hasAttachment) {
      conditions.push(
        "EXISTS(SELECT 1 FROM attachments WHERE attachments.note_id=notes.id AND attachments.type=?)",
      );
      params.push(input.hasAttachment);
    }

    if (input.dateRange) {
      const col = input.dateRange.field === "created_at" ? "notes.created_at" : "notes.updated_at";
      if (input.dateRange.from !== undefined && input.dateRange.to !== undefined) {
        conditions.push(`${col} BETWEEN ? AND ?`);
        params.push(input.dateRange.from, input.dateRange.to);
      } else if (input.dateRange.from !== undefined) {
        conditions.push(`${col} >= ?`);
        params.push(input.dateRange.from);
      } else if (input.dateRange.to !== undefined) {
        conditions.push(`${col} <= ?`);
        params.push(input.dateRange.to);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*) as total FROM notes ${where}`;
    const countRows = await this.client.query<Row>(countSql, params);
    const total = (countRows[0]?.total as number) ?? 0;

    const sortBy = input.sortBy ?? "updated_at";
    const sortOrder = input.sortOrder ?? "desc";
    const orderCol =
      sortBy === "title"
        ? "notes.title"
        : sortBy === "created_at"
          ? "notes.created_at"
          : "notes.updated_at";
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;

    const dataSql = `SELECT notes.id, notes.title, notes.updated_at FROM notes ${where} ORDER BY ${orderCol} ${sortOrder === "asc" ? "ASC" : "DESC"} LIMIT ? OFFSET ?`;
    const dataRows = await this.client.query<Row>(dataSql, [...params, limit, offset]);

    return {
      notes: dataRows.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        updatedAt: r.updated_at as number,
      })),
      total,
      hasMore: offset + limit < total,
    };
  }

  async createTag(name: string): Promise<Tag> {
    const existing = await this.client.query<Row>(`SELECT id, name FROM tags WHERE name=?`, [name]);
    if (existing.length > 0) {
      return { id: existing[0].id as string, name: existing[0].name as string };
    }
    const id = generateId();
    await this.client.run(`INSERT INTO tags (id, name) VALUES (?, ?)`, [id, name]);
    return { id, name };
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    await this.client.run(`INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, [noteId, tagId]);
  }

  async addTagsToNote(noteId: string, tagIds: string[]): Promise<void> {
    for (const tagId of tagIds) {
      await this.client.run(`INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, [
        noteId,
        tagId,
      ]);
    }
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await this.client.run(`DELETE FROM note_tags WHERE note_id=? AND tag_id=?`, [noteId, tagId]);
  }

  async removeTagsFromNote(noteId: string, tagIds: string[]): Promise<void> {
    for (const tagId of tagIds) {
      await this.client.run(`DELETE FROM note_tags WHERE note_id=? AND tag_id=?`, [noteId, tagId]);
    }
  }

  async getTagsForNote(noteId: string): Promise<Tag[]> {
    const rows = await this.client.query<Row>(
      `SELECT t.id, t.name FROM tags t INNER JOIN note_tags nt ON t.id=nt.tag_id WHERE nt.note_id=?`,
      [noteId],
    );
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
    }));
  }

  async listTags(): Promise<Tag[]> {
    const rows = await this.client.query<Row>(`SELECT id, name FROM tags ORDER BY name ASC`);
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
    }));
  }

  async deleteTag(id: string): Promise<void> {
    await this.client.run(`DELETE FROM note_tags WHERE tag_id=?`, [id]);
    await this.client.run(`DELETE FROM tags WHERE id=?`, [id]);
  }

  async getNotesForTag(tagId: string): Promise<Note[]> {
    const rows = await this.client.query<Row>(
      `SELECT notes.* FROM notes INNER JOIN note_tags ON notes.id=note_tags.note_id WHERE note_tags.tag_id=? AND notes.deleted_at IS NULL`,
      [tagId],
    );
    return rows.map(mapNoteRow);
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
