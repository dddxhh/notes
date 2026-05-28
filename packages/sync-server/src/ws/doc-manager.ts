import * as Y from "yjs";
import { getDocUpdates, storeUpdate } from "./persistence";

export class DocManager {
  private docs = new Map<string, Y.Doc>();
  private connections = new Map<string, number>();

  async getDoc(docName: string): Promise<Y.Doc> {
    const existing = this.docs.get(docName);
    if (existing) return existing;

    const doc = new Y.Doc();
    const updates = await getDocUpdates(docName);
    for (const update of updates) {
      Y.applyUpdate(doc, update);
    }

    this.docs.set(docName, doc);
    this.connections.set(docName, 0);
    return doc;
  }

  hasDoc(docName: string): boolean {
    return this.docs.has(docName);
  }

  async applyUpdate(docName: string, update: Uint8Array, userId: string): Promise<void> {
    const doc = await this.getDoc(docName);
    Y.applyUpdate(doc, update);
    await storeUpdate(docName, update, userId);
  }

  addConnection(docName: string): void {
    const count = this.connections.get(docName) ?? 0;
    this.connections.set(docName, count + 1);
  }

  removeConnection(docName: string): void {
    const count = (this.connections.get(docName) ?? 1) - 1;
    if (count <= 0) {
      this.connections.delete(docName);
      const doc = this.docs.get(docName);
      if (doc) {
        doc.destroy();
        this.docs.delete(docName);
      }
    } else {
      this.connections.set(docName, count);
    }
  }

  getConnectionCount(docName: string): number {
    return this.connections.get(docName) ?? 0;
  }

  getSubscribers(_docName: string): Set<any> {
    return new Set();
  }
}
