import { initSQLite, closeSQLite, runSQL, querySQL } from "@notes/core";
import type { SQLiteDB } from "@notes/core";
import {
  SharedWorkerSQLiteHandler,
  type SqlRequest,
  type DataChangeNotification,
} from "./sqlite-shared-worker";

class WorkerSQLExecutor {
  private sqliteDB: SQLiteDB | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.sqliteDB) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.sqliteDB = await initSQLite();
    })();

    try {
      await this.initPromise;
    } catch (e) {
      console.error("[Worker] executor.init FAILED:", e);
      throw e;
    } finally {
      this.initPromise = null;
    }
  }

  async close(): Promise<void> {
    if (this.sqliteDB) {
      await closeSQLite(this.sqliteDB);
      this.sqliteDB = null;
    }
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    if (!this.sqliteDB) throw new Error("SQLite not initialized");
    return querySQL(
      this.sqliteDB,
      sql,
      params as (number | string | Uint8Array | Array<number> | bigint | null)[],
    );
  }

  async run(sql: string, params?: unknown[]): Promise<void> {
    if (!this.sqliteDB) throw new Error("SQLite not initialized");
    await runSQL(
      this.sqliteDB,
      sql,
      params as (number | string | Uint8Array | Array<number> | bigint | null)[],
    );
  }
}

const handler = new SharedWorkerSQLiteHandler();
const executor = new WorkerSQLExecutor();
handler.setExecutor(executor);

const ports = new Set<MessagePort>();
let processing = false;
const pendingQueue: Array<{ request: SqlRequest; port: MessagePort }> = [];

function broadcast(notification: DataChangeNotification): void {
  for (const port of ports) {
    try {
      port.postMessage(notification);
    } catch {}
  }
}

handler.setBroadcastFn(broadcast);

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  while (pendingQueue.length > 0) {
    const { request, port } = pendingQueue.shift()!;
    const response = await handler.handleRequest(request);
    port.postMessage(response);
  }
  processing = false;
}

const workerSelf = self as unknown as {
  onconnect: ((ev: MessageEvent) => void) | null;
  onclose: ((ev: Event) => void) | null;
};

workerSelf.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  ports.add(port);

  port.onmessage = (e: MessageEvent) => {
    const request: SqlRequest = e.data;
    pendingQueue.push({ request, port });
    processQueue();
  };

  port.start();
};

workerSelf.onclose = () => {
  for (const port of ports) {
    port.close();
  }
  ports.clear();
};
