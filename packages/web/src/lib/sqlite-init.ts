import { WebStorageAdapter } from "@notes/core";

let adapter: WebStorageAdapter | null = null;
let initPromise: Promise<WebStorageAdapter> | null = null;

export async function initStorage(): Promise<WebStorageAdapter> {
  if (adapter) return adapter;
  if (initPromise) return initPromise;
  const newAdapter = new WebStorageAdapter();
  initPromise = newAdapter.init().then(() => {
    adapter = newAdapter;
    initPromise = null;
    return adapter;
  }).catch((e) => {
    initPromise = null;
    throw e;
  });
  return initPromise;
}

export function getStorage(): WebStorageAdapter {
  if (!adapter) throw new Error("存储未初始化，请先调用 initStorage()");
  return adapter;
}

export async function closeStorage(): Promise<void> {
  if (adapter) {
    await adapter.close();
    adapter = null;
  }
}