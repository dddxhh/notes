import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  WriteLock,
  isWriteOperation,
  extractTableName,
  SharedWorkerSQLiteHandler,
  SharedWorkerSQLiteClient,
  type SqlRequest,
  type SqlResponse,
  type DataChangeNotification,
  type SQLExecutor,
} from "../../src/lib/sqlite-shared-worker";

function createMockExecutor(): SQLExecutor {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue(undefined),
  };
}

describe("SharedWorker single-write-lock for multi-tab SQLite coordination", () => {
  describe("WriteLock", () => {
    it("should acquire immediately when not locked", async () => {
      const lock = new WriteLock();
      await lock.acquire();
      expect(lock.isLocked()).toBe(true);
      lock.release();
      expect(lock.isLocked()).toBe(false);
    });

    it("should queue concurrent acquisitions and release sequentially", async () => {
      const lock = new WriteLock();
      const order: number[] = [];

      await lock.acquire();
      order.push(1);

      const p2 = lock.acquire().then(() => {
        order.push(2);
        lock.release();
      });
      const p3 = lock.acquire().then(() => {
        order.push(3);
        lock.release();
      });

      lock.release();
      await p2;
      await p3;

      expect(order).toEqual([1, 2, 3]);
    });

    it("should handle rapid acquire/release cycles", async () => {
      const lock = new WriteLock();
      for (let i = 0; i < 10; i++) {
        await lock.acquire();
        lock.release();
      }
      expect(lock.isLocked()).toBe(false);
    });

    it("should allow re-acquisition after full release", async () => {
      const lock = new WriteLock();
      await lock.acquire();
      lock.release();
      expect(lock.isLocked()).toBe(false);
      await lock.acquire();
      expect(lock.isLocked()).toBe(true);
      lock.release();
    });
  });

  describe("isWriteOperation", () => {
    it("should classify INSERT as write", () => {
      expect(isWriteOperation("INSERT INTO notes VALUES (...)")).toBe(true);
    });
    it("should classify UPDATE as write", () => {
      expect(isWriteOperation("UPDATE notes SET title=? WHERE id=?")).toBe(true);
    });
    it("should classify DELETE as write", () => {
      expect(isWriteOperation("DELETE FROM notes WHERE id=?")).toBe(true);
    });
    it("should classify CREATE as write", () => {
      expect(isWriteOperation("CREATE TABLE IF NOT EXISTS foo (...)")).toBe(true);
    });
    it("should classify ALTER as write", () => {
      expect(isWriteOperation("ALTER TABLE foo ADD COLUMN bar")).toBe(true);
    });
    it("should classify DROP as write", () => {
      expect(isWriteOperation("DROP TABLE IF EXISTS foo")).toBe(true);
    });
    it("should classify REPLACE as write", () => {
      expect(isWriteOperation("REPLACE INTO notes VALUES (...)")).toBe(true);
    });
    it("should classify SELECT as read", () => {
      expect(isWriteOperation("SELECT * FROM notes WHERE id=?")).toBe(false);
    });
    it("should handle lowercase SQL", () => {
      expect(isWriteOperation("insert into notes ...")).toBe(true);
    });
    it("should handle leading whitespace", () => {
      expect(isWriteOperation("  UPDATE notes SET ...")).toBe(true);
    });
    it("should classify FTS rebuild as write (starts with INSERT)", () => {
      expect(isWriteOperation("INSERT INTO notes_fts(notes_fts) VALUES('rebuild')")).toBe(true);
    });
  });

  describe("extractTableName", () => {
    it("should extract table from INSERT INTO", () => {
      expect(extractTableName("INSERT INTO notes (id) VALUES (?)")).toBe("notes");
    });
    it("should extract table from UPDATE", () => {
      expect(extractTableName("UPDATE notes SET title=? WHERE id=?")).toBe("notes");
    });
    it("should extract table from DELETE FROM", () => {
      expect(extractTableName("DELETE FROM folders WHERE id=?")).toBe("folders");
    });
    it("should extract table from CREATE TABLE IF NOT EXISTS", () => {
      expect(extractTableName("CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY)")).toBe(
        "tags",
      );
    });
    it("should extract table from CREATE VIRTUAL TABLE", () => {
      expect(extractTableName("CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(...)")).toBe(
        "notes_fts",
      );
    });
    it("should return null for SELECT", () => {
      expect(extractTableName("SELECT * FROM notes")).toBeNull();
    });
    it("should return null for unrecognized SQL", () => {
      expect(extractTableName("PRAGMA journal_mode=WAL")).toBeNull();
    });
  });

  describe("SharedWorkerSQLiteHandler", () => {
    let handler: SharedWorkerSQLiteHandler;
    let executor: SQLExecutor;
    let broadcastFn: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      executor = createMockExecutor();
      broadcastFn = vi.fn();
      handler = new SharedWorkerSQLiteHandler(executor);
      handler.setBroadcastFn(broadcastFn);
    });

    it("should handle init request", async () => {
      const response = await handler.handleRequest({
        id: "1",
        type: "init",
      });
      expect(response).toEqual({ id: "1", type: "init-result" });
      expect(executor.init).toHaveBeenCalledOnce();
    });

    it("should handle close request", async () => {
      await handler.handleRequest({ id: "1", type: "init" });
      const response = await handler.handleRequest({
        id: "2",
        type: "close",
      });
      expect(response).toEqual({ id: "2", type: "close-result" });
      expect(executor.close).toHaveBeenCalledOnce();
    });

    it("should handle query (read) without write lock", async () => {
      (executor.query as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "abc", title: "test" },
      ]);
      const response = await handler.handleRequest({
        id: "1",
        type: "query",
        sql: "SELECT * FROM notes",
        params: [],
      });
      expect(response).toEqual({
        id: "1",
        type: "query-result",
        rows: [{ id: "abc", title: "test" }],
      });
      expect(executor.query).toHaveBeenCalledWith("SELECT * FROM notes", []);
    });

    it("should handle run (write) with write lock and broadcast", async () => {
      const response = await handler.handleRequest({
        id: "1",
        type: "run",
        sql: "INSERT INTO notes (id) VALUES (?)",
        params: ["abc"],
      });
      expect(response).toEqual({ id: "1", type: "run-result" });
      expect(executor.run).toHaveBeenCalledWith("INSERT INTO notes (id) VALUES (?)", ["abc"]);
      expect(broadcastFn).toHaveBeenCalledWith({
        type: "data-change",
        tables: ["notes"],
      });
    });

    it("should not broadcast for read operations", async () => {
      await handler.handleRequest({
        id: "1",
        type: "query",
        sql: "SELECT * FROM notes",
        params: [],
      });
      expect(broadcastFn).not.toHaveBeenCalled();
    });

    it("should serialize concurrent write operations (mutual exclusion)", async () => {
      let runningCount = 0;
      let maxConcurrent = 0;

      (executor.run as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        runningCount++;
        maxConcurrent = Math.max(maxConcurrent, runningCount);
        await new Promise((r) => setTimeout(r, 30));
        runningCount--;
      });

      const responses = await Promise.all([
        handler.handleRequest({
          id: "a",
          type: "run",
          sql: "INSERT INTO notes ...",
          params: [],
        }),
        handler.handleRequest({
          id: "b",
          type: "run",
          sql: "UPDATE notes SET ...",
          params: [],
        }),
        handler.handleRequest({
          id: "c",
          type: "run",
          sql: "DELETE FROM notes ...",
          params: [],
        }),
      ]);

      expect(responses).toHaveLength(3);
      expect(responses.every((r) => r.type === "run-result")).toBe(true);
      expect(maxConcurrent).toBeLessThanOrEqual(1);
    });

    it("should allow concurrent read operations", async () => {
      let runningCount = 0;
      let maxConcurrent = 0;

      (executor.query as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        runningCount++;
        maxConcurrent = Math.max(maxConcurrent, runningCount);
        await new Promise((r) => setTimeout(r, 30));
        runningCount--;
        return [];
      });

      await Promise.all([
        handler.handleRequest({
          id: "a",
          type: "query",
          sql: "SELECT * FROM notes",
          params: [],
        }),
        handler.handleRequest({
          id: "b",
          type: "query",
          sql: "SELECT * FROM folders",
          params: [],
        }),
        handler.handleRequest({
          id: "c",
          type: "query",
          sql: "SELECT * FROM tags",
          params: [],
        }),
      ]);

      expect(maxConcurrent).toBeGreaterThanOrEqual(2);
    });

    it("should release write lock after error", async () => {
      (executor.run as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("SQL error"));

      const response = await handler.handleRequest({
        id: "1",
        type: "run",
        sql: "INSERT INTO notes ...",
        params: [],
      });
      expect(response.error).toBe("SQL error");

      (executor.run as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const response2 = await handler.handleRequest({
        id: "2",
        type: "run",
        sql: "INSERT INTO folders ...",
        params: [],
      });
      expect(response2.type).toBe("run-result");
      expect(response2.error).toBeUndefined();
    });

    it("should return error for unknown request type", async () => {
      const response = await handler.handleRequest({
        id: "1",
        type: "unknown" as any,
      });
      expect(response.error).toContain("Unknown request type");
    });

    it("should handle run (read-like SQL) without write lock", async () => {
      const response = await handler.handleRequest({
        id: "1",
        type: "run",
        sql: "PRAGMA journal_mode=WAL",
        params: [],
      });
      expect(response).toEqual({ id: "1", type: "run-result" });
      expect(broadcastFn).not.toHaveBeenCalled();
    });
  });

  describe("SharedWorkerSQLiteClient", () => {
    let client: SharedWorkerSQLiteClient;
    let capturedRequests: SqlRequest[];
    let mockPort: {
      onmessage: ((e: { data: SqlResponse }) => void) | null;
      start: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
      postMessage: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      capturedRequests = [];
      mockPort = {
        onmessage: null,
        start: vi.fn(),
        close: vi.fn(),
        postMessage: vi.fn((data: SqlRequest) => {
          capturedRequests.push(data);
        }),
      };

      vi.stubGlobal("SharedWorker", vi.fn().mockReturnValue({ port: mockPort }));
      vi.stubGlobal(
        "BroadcastChannel",
        vi.fn().mockImplementation((name: string) => ({
          name,
          onmessage: null as any,
          postMessage: vi.fn(),
          close: vi.fn(),
        })),
      );

      client = new SharedWorkerSQLiteClient();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function respondTo(request: SqlRequest, extra: Partial<SqlResponse> = {}) {
      mockPort.onmessage!({
        data: { id: request.id, type: `${request.type}-result`, ...extra },
      });
    }

    it("should create SharedWorker on init and send init request", async () => {
      const initPromise = client.init();
      expect(capturedRequests.length).toBeGreaterThan(0);
      const initReq = capturedRequests.find((r) => r.type === "init")!;
      respondTo(initReq);
      await initPromise;
      expect(SharedWorker).toHaveBeenCalled();
    });

    it("should send query and receive results", async () => {
      const initPromise = client.init();
      respondTo(capturedRequests[0]);
      await initPromise;

      const queryPromise = client.query("SELECT * FROM notes");
      const queryReq = capturedRequests.find((r) => r.type === "query")!;
      respondTo(queryReq, { rows: [{ id: "x", title: "test" }] });
      const result = await queryPromise;
      expect(result).toEqual([{ id: "x", title: "test" }]);
    });

    it("should send run and receive confirmation", async () => {
      const initPromise = client.init();
      respondTo(capturedRequests[0]);
      await initPromise;

      const runPromise = client.run("INSERT INTO notes ...", ["abc"]);
      const runReq = capturedRequests.find((r) => r.type === "run")!;
      respondTo(runReq);
      await runPromise;
    });

    it("should reject on error response", async () => {
      const initPromise = client.init();
      respondTo(capturedRequests[0]);
      await initPromise;

      const queryPromise = client.query("BAD SQL");
      const queryReq = capturedRequests.find((r) => r.type === "query")!;
      respondTo(queryReq, { error: "syntax error" });
      await expect(queryPromise).rejects.toThrow("syntax error");
    });

    it("should close worker and broadcast channel", async () => {
      const initPromise = client.init();
      respondTo(capturedRequests[0]);
      await initPromise;

      const closePromise = client.close();
      const closeReq = capturedRequests.find((r) => r.type === "close")!;
      respondTo(closeReq);
      await closePromise;
      expect(mockPort.close).toHaveBeenCalled();
    });

    it("should detect SharedWorker availability", () => {
      expect(SharedWorkerSQLiteClient.isAvailable()).toBe(true);
      vi.unstubAllGlobals();
      expect(SharedWorkerSQLiteClient.isAvailable()).toBe(false);
      vi.stubGlobal("SharedWorker", vi.fn());
      expect(SharedWorkerSQLiteClient.isAvailable()).toBe(true);
      vi.unstubAllGlobals();
    });

    it("should receive data change notifications via BroadcastChannel", async () => {
      const initPromise = client.init();
      respondTo(capturedRequests[0]);
      await initPromise;

      const listener = vi.fn();
      client.onDataChange(listener);

      const bcInstance = (BroadcastChannel as ReturnType<typeof vi.fn>).mock.results[0].value;
      bcInstance.onmessage({
        data: { type: "data-change", tables: ["notes"] },
      });
      expect(listener).toHaveBeenCalledWith(["notes"]);
    });

    it("should allow unsubscribing from data change notifications", async () => {
      const initPromise = client.init();
      respondTo(capturedRequests[0]);
      await initPromise;

      const listener = vi.fn();
      const unsub = client.onDataChange(listener);
      unsub();

      const bcInstance = (BroadcastChannel as ReturnType<typeof vi.fn>).mock.results[0].value;
      bcInstance.onmessage({
        data: { type: "data-change", tables: ["notes"] },
      });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
