import { WebStorageAdapter } from "@notes/core";
import type { StorageAdapter } from "@notes/core";
import { SharedWorkerSQLiteClient, SharedWorkerStorageAdapter } from "./sqlite-shared-worker";

type ConnectionMode = "shared-worker" | "direct";

let adapter: StorageAdapter | null = null;
let initPromise: Promise<StorageAdapter> | null = null;
let connectionMode: ConnectionMode = "direct";

export async function initStorage(): Promise<StorageAdapter> {
  if (adapter) return adapter;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (SharedWorkerSQLiteClient.isAvailable()) {
        const client = new SharedWorkerSQLiteClient();
        const swAdapter = new SharedWorkerStorageAdapter(client);
        await swAdapter.init();
        connectionMode = "shared-worker";
        adapter = swAdapter;
        return adapter;
      }
    } catch {
      connectionMode = "direct";
    }

    const directAdapter = new WebStorageAdapter();
    await directAdapter.init();
    connectionMode = "direct";
    adapter = directAdapter;
    return adapter;
  })()
    .then((a) => {
      initPromise = null;
      return a;
    })
    .catch((e) => {
      initPromise = null;
      throw e;
    });

  return initPromise;
}

export function getStorage(): StorageAdapter {
  if (!adapter) throw new Error("存储未初始化，请先调用 initStorage()");
  return adapter;
}

export function getConnectionMode(): ConnectionMode {
  return connectionMode;
}

export async function closeStorage(): Promise<void> {
  if (adapter) {
    await adapter.close();
    adapter = null;
  }
}
