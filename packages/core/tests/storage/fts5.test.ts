import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initSQLite, closeSQLite } from "../../src/storage/sqlite";
import { searchNotes } from "../../src/search/fts5";
import { runSQL } from "../../src/storage/sqlite";
import { generateId } from "../../src/utils";
import type { SQLiteDB } from "../../src/storage/sqlite";

describe.skip("FTS5 搜索 (WASM not available in vitest/happy-dom)", () => {
  let db: SQLiteDB;

  beforeAll(async () => {
    db = await initSQLite("test_fts5");

    const folderId = generateId();
    await runSQL(db, `INSERT INTO folders (id, name, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, NULL, 0, ?, ?)`, [folderId, "测试文件夹", Date.now(), Date.now()]);

    const tag1Id = generateId();
    const tag2Id = generateId();
    await runSQL(db, `INSERT INTO tags (id, name) VALUES (?, ?)`, [tag1Id, "重要"]);
    await runSQL(db, `INSERT INTO tags (id, name) VALUES (?, ?)`, [tag2Id, "工作"]);

    const now = Date.now();
    const noteIds = [generateId(), generateId(), generateId()];
    await runSQL(db, `INSERT INTO notes (id, title, content_json, md_text, folder_id, type, created_at, updated_at, deleted_at, version) VALUES (?, ?, ?, ?, ?, 'rich', ?, ?, NULL, 1)`, [noteIds[0], "SQLite全文搜索", "关于FTS5的内容", "# SQLite全文搜索", folderId, now - 1000, now]);
    await runSQL(db, `INSERT INTO notes (id, title, content_json, md_text, folder_id, type, created_at, updated_at, deleted_at, version) VALUES (?, ?, ?, ?, ?, 'rich', ?, ?, NULL, 1)`, [noteIds[1], "索引数据库优化", "数据库性能优化方案", "# 索引数据库优化", null, now - 500, now]);
    await runSQL(db, `INSERT INTO notes (id, title, content_json, md_text, folder_id, type, created_at, updated_at, deleted_at, version) VALUES (?, ?, ?, ?, ?, 'rich', ?, ?, ?, 1)`, [noteIds[2], "已删除笔记", "已删除的内容", null, null, now, now, now]);

    await runSQL(db, `INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);

    await runSQL(db, `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, [noteIds[0], tag1Id]);
    await runSQL(db, `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, [noteIds[0], tag2Id]);
    await runSQL(db, `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, [noteIds[1], tag2Id]);
  });

  afterAll(async () => {
    await closeSQLite(db);
  });

  it("全文搜索关键词", async () => {
    const result = await searchNotes(db, { query: "SQLite" });
    expect(result.total).toBe(1);
    expect(result.notes[0].title).toBe("SQLite全文搜索");
  });

  it("文件夹过滤", async () => {
    const folders = await querySQL(db, `SELECT id FROM folders LIMIT 1`);
    const folderId = folders[0].id as string;
    const result = await searchNotes(db, { folderId });
    expect(result.total).toBe(1);
    expect(result.notes[0].title).toBe("SQLite全文搜索");
  });

  it("标签交集过滤", async () => {
    const tags = await querySQL(db, `SELECT id FROM tags ORDER BY name`);
    const tag1Id = tags[0].id as string;
    const tag2Id = tags[1].id as string;
    const result = await searchNotes(db, { tagIds: [tag1Id, tag2Id], tagMode: "intersection" });
    expect(result.total).toBe(1);
  });

  it("标签并集过滤", async () => {
    const tags = await querySQL(db, `SELECT id FROM tags ORDER BY name`);
    const tag1Id = tags[0].id as string;
    const tag2Id = tags[1].id as string;
    const result = await searchNotes(db, { tagIds: [tag1Id, tag2Id], tagMode: "union" });
    expect(result.total).toBe(2);
  });

  it("分页与hasMore", async () => {
    const result = await searchNotes(db, { limit: 1, offset: 0 });
    expect(result.notes.length).toBe(1);
    expect(result.hasMore).toBe(true);

    const result2 = await searchNotes(db, { limit: 1, offset: 1 });
    expect(result2.hasMore).toBe(false);
  });
});

async function querySQL(sqliteDB: SQLiteDB, sql: string, params?: (string | number | null)[]) {
  const { querySQL: q } = await import("../../src/storage/sqlite");
  return q(sqliteDB, sql, params);
}