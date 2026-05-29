import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import type { SyncConfig, SyncStatus } from "@notes/core";

type StatusListener = (status: SyncStatus) => void;

export class SyncEngine {
  private config: SyncConfig;
  private providers = new Map<string, WebsocketProvider>();
  private idbProviders = new Map<string, IndexeddbPersistence>();
  private docs = new Map<string, Y.Doc>();
  private statusListeners = new Set<StatusListener>();
  private currentStatus: SyncStatus = "disconnected";
  private connectionStates = new Map<string, string>();

  constructor(config: SyncConfig) {
    this.config = config;
  }

  getNoteDoc(noteId: string): Y.Doc {
    const existing = this.docs.get(noteId);
    if (existing) return existing;

    const doc = new Y.Doc();
    const docName = `note:${noteId}`;

    const wsUrl = this.config.serverUrl.replace(/^http/, "ws") + "/ws";
    const wsProvider = new WebsocketProvider(wsUrl, docName, doc, {
      params: { token: this.config.token },
    });

    wsProvider.on("status", (event: { status: string }) => {
      this.connectionStates.set(noteId, event.status);
      this.recomputeStatus();
    });

    const idbProvider = new IndexeddbPersistence(docName, doc);

    this.providers.set(noteId, wsProvider);
    this.idbProviders.set(noteId, idbProvider);
    this.docs.set(noteId, doc);

    return doc;
  }

  getProvider(noteId: string): WebsocketProvider | null {
    return this.providers.get(noteId) || null;
  }

  destroyNoteDoc(noteId: string): void {
    this.providers.get(noteId)?.destroy();
    this.idbProviders.get(noteId)?.destroy();
    this.docs.get(noteId)?.destroy();
    this.providers.delete(noteId);
    this.idbProviders.delete(noteId);
    this.docs.delete(noteId);
    this.connectionStates.delete(noteId);
    this.recomputeStatus();
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): SyncStatus {
    return this.currentStatus;
  }

  disconnect(): void {
    for (const provider of this.providers.values()) {
      provider.destroy();
    }
    for (const provider of this.idbProviders.values()) {
      provider.destroy();
    }
    for (const doc of this.docs.values()) {
      doc.destroy();
    }
    this.providers.clear();
    this.idbProviders.clear();
    this.docs.clear();
    this.connectionStates.clear();
    this.updateStatus("disconnected");
  }

  private recomputeStatus(): void {
    const states = Array.from(this.connectionStates.values());
    if (states.length === 0) {
      this.updateStatus("disconnected");
    } else if (states.some((s) => s === "connected")) {
      this.updateStatus("connected");
    } else if (states.some((s) => s === "connecting")) {
      this.updateStatus("syncing");
    } else {
      this.updateStatus("disconnected");
    }
  }

  private updateStatus(status: SyncStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }
}
