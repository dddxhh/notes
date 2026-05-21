import { describe, it, expect } from "vitest";
import { initSQLite, closeSQLite, getDB, getApi } from "../../src/storage/sqlite";

describe.skip("SQLite 存储（wa-sqlite 需要 WASM 运行环境，happy-dom 不支持）", () => {
  it("initSQLite 应返回数据库实例", async () => {
    const db = await initSQLite();
    expect(db).toBeDefined();
    expect(typeof db).toBe("number");
    await closeSQLite();
  });

  it("DDL 应创建 folders 表", async () => {
    const db = await initSQLite();
    const api = getApi();
    const tables: string[] = [];
    await api.exec(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='folders'",
      (row) => {
        tables.push(row[0] as string);
      }
    );
    expect(tables).toContain("folders");
    await closeSQLite();
  });

  it("DDL 应创建 notes 表", async () => {
    const db = await initSQLite();
    const api = getApi();
    const tables: string[] = [];
    await api.exec(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notes'",
      (row) => {
        tables.push(row[0] as string);
      }
    );
    expect(tables).toContain("notes");
    await closeSQLite();
  });

  it("DDL 应创建 notes_fts 虚拟表", async () => {
    const db = await initSQLite();
    const api = getApi();
    const tables: string[] = [];
    await api.exec(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name='notes_fts'",
      (row) => {
        tables.push(row[0] as string);
      }
    );
    expect(tables).toContain("notes_fts");
    await closeSQLite();
  });
});