import { describe, it, expect } from "vitest";
import { initSQLite, closeSQLite } from "../../src/storage/sqlite";

describe.skip("SQLite 存储（wa-sqlite 需要 WASM 运行环境，happy-dom 不支持）", () => {
  it("initSQLite 应返回 SQLiteDB 实例", async () => {
    const sqliteDB = await initSQLite();
    expect(sqliteDB).toBeDefined();
    expect(sqliteDB.db).toBeDefined();
    expect(sqliteDB.sqlite3).toBeDefined();
    await closeSQLite(sqliteDB);
  });

  it("DDL 应创建 folders 表", async () => {
    const sqliteDB = await initSQLite();
    const tables: string[] = [];
    await sqliteDB.sqlite3.exec(
      sqliteDB.db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='folders'",
      (row) => {
        tables.push(row[0] as string);
      },
    );
    expect(tables).toContain("folders");
    await closeSQLite(sqliteDB);
  });

  it("DDL 应创建 notes 表", async () => {
    const sqliteDB = await initSQLite();
    const tables: string[] = [];
    await sqliteDB.sqlite3.exec(
      sqliteDB.db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notes'",
      (row) => {
        tables.push(row[0] as string);
      },
    );
    expect(tables).toContain("notes");
    await closeSQLite(sqliteDB);
  });

  it("DDL 应创建 notes_fts 虚拟表", async () => {
    const sqliteDB = await initSQLite();
    const tables: string[] = [];
    await sqliteDB.sqlite3.exec(
      sqliteDB.db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notes_fts'",
      (row) => {
        tables.push(row[0] as string);
      },
    );
    expect(tables).toContain("notes_fts");
    await closeSQLite(sqliteDB);
  });
});
