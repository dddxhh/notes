import { WebStorageAdapter } from "@notes/core";

let adapter: WebStorageAdapter | null = null;

export async function initStorage(): Promise<WebStorageAdapter> {
  if (adapter) return adapter;
  adapter = new WebStorageAdapter();
  await adapter.init();
  return adapter;
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