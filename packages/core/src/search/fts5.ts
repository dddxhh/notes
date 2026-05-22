import { SQLiteDB, querySQL } from "../storage/sqlite";
import { SearchInput, SearchResult } from "../models";

type Row = Record<string, number | string | null>;

export async function searchNotes(db: SQLiteDB, input: SearchInput): Promise<SearchResult> {
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
        conditions.push("EXISTS(SELECT 1 FROM note_tags WHERE note_tags.note_id=notes.id AND note_tags.tag_id=?)");
        params.push(tagId);
      }
    } else {
      const placeholders = input.tagIds.map(() => "?").join(",");
      conditions.push(`EXISTS(SELECT 1 FROM note_tags WHERE note_tags.note_id=notes.id AND note_tags.tag_id IN (${placeholders}))`);
      params.push(...input.tagIds);
    }
  }

  if (input.hasAttachment) {
    conditions.push("EXISTS(SELECT 1 FROM attachments WHERE attachments.note_id=notes.id AND attachments.type=?)");
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
  const countRows = await querySQL<Row>(db, countSql, params);
  const total = (countRows[0]?.total as number) ?? 0;

  const sortBy = input.sortBy ?? "updated_at";
  const sortOrder = input.sortOrder ?? "desc";
  const orderCol = sortBy === "title" ? "notes.title" : sortBy === "created_at" ? "notes.created_at" : "notes.updated_at";
  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;

  const dataSql = `SELECT notes.id, notes.title, notes.updated_at FROM notes ${where} ORDER BY ${orderCol} ${sortOrder === "asc" ? "ASC" : "DESC"} LIMIT ? OFFSET ?`;
  const dataRows = await querySQL<Row>(db, dataSql, [...params, limit, offset]);

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