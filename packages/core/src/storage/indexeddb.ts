const DB_NAME = "notes-attachments";
const DB_VERSION = 1;
const ATTACHMENTS_STORE = "attachments-store";
const THUMBNAILS_STORE = "thumbnails-store";

let idb: IDBDatabase | null = null;

export async function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ATTACHMENTS_STORE)) {
        database.createObjectStore(ATTACHMENTS_STORE);
      }
      if (!database.objectStoreNames.contains(THUMBNAILS_STORE)) {
        database.createObjectStore(THUMBNAILS_STORE);
      }
    };
    request.onsuccess = () => {
      idb = request.result;
      resolve(idb);
    };
    request.onerror = () => reject(request.error);
  });
}

export function closeIndexedDB(): void {
  if (idb !== null) {
    idb.close();
    idb = null;
  }
}

function getStore(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
  if (idb === null) {
    throw new Error("IndexedDB not initialized");
  }
  const tx = idb.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const store = getStore(ATTACHMENTS_STORE, "readwrite");
    const request = store.put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve, reject) => {
    const store = getStore(ATTACHMENTS_STORE, "readonly");
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveThumbnail(id: string, blob: Blob): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const store = getStore(THUMBNAILS_STORE, "readwrite");
    const request = store.put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getThumbnail(id: string): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve, reject) => {
    const store = getStore(THUMBNAILS_STORE, "readonly");
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBlob(id: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (idb === null) {
      throw new Error("IndexedDB not initialized");
    }
    const tx = idb.transaction([ATTACHMENTS_STORE, THUMBNAILS_STORE], "readwrite");
    tx.objectStore(ATTACHMENTS_STORE).delete(id);
    tx.objectStore(THUMBNAILS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function generateImageThumbnail(blob: Blob, maxWidth: number = 200): Promise<Blob> {
  const imageBitmap = await createImageBitmap(blob);
  const ratio = maxWidth / imageBitmap.width;
  const width = maxWidth;
  const height = Math.round(imageBitmap.height * ratio);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();
  return canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
}
