import { initSQLite, closeSQLite, runSQL, querySQL } from "@notes/core";
import type { SQLiteDB } from "@notes/core";
import {
  SharedWorkerSQLiteHandler,
  type SqlRequest,
  type DataChangeNotification,
} from "./sqlite-shared-worker";

class WorkerSQLExecutor {
  private sqliteDB: SQLiteDB | null = null;

  async init(): Promise<void> {
    this.sqliteDB = await initSQLite();
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

function broadcast(notification: DataChangeNotification): void {
  for (const port of ports) {
    try {
      port.postMessage(notification);
    } catch {}
  }
}

handler.setBroadcastFn(broadcast);

const workerSelf = self as unknown as {
  onconnect: ((ev: MessageEvent) => void) | null;
  onclose: ((ev: Event) => void) | null;
};

workerSelf.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  ports.add(port);

  port.onmessage = async (e: MessageEvent) => {
    const request: SqlRequest = e.data;
    const response = await handler.handleRequest(request);
    port.postMessage(response);
  };

  port.start();
};

workerSelf.onclose = () => {
  for (const port of ports) {
    port.close();
  }
  ports.clear();
};
