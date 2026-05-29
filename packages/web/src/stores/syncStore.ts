import { create } from "zustand";
import type { SyncStatus, SyncConfig } from "@notes/core";
import { SyncEngine } from "../lib/sync-engine";
import { SyncClient } from "../lib/sync-client";
import { pullAll, setSyncClient } from "../lib/sync-metadata";
import { useAuthStore } from "./authStore";

let pullAllPromise: Promise<void> | null = null;

interface SyncStoreState {
  status: SyncStatus;
  engine: SyncEngine | null;
  config: SyncConfig | null;

  initSync: (config: SyncConfig) => void;
  disconnect: () => void;
  setStatus: (status: SyncStatus) => void;
  getNoteDoc: (noteId: string) => ReturnType<SyncEngine["getNoteDoc"]> | null;
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  status: "disconnected",
  engine: null,
  config: null,

  initSync: (config: SyncConfig) => {
    // Prevent concurrent initialization
    if (pullAllPromise) {
      console.log("[syncStore] initSync already in progress, skipping");
      return;
    }

    const existing = get().engine;
    if (existing) {
      existing.disconnect();
      set({ engine: null, config: null, status: "disconnected" });
    }

    const engine = new SyncEngine(config);
    engine.onStatusChange((status) => {
      set({ status });
    });

    const client = new SyncClient({
      serverUrl: config.serverUrl,
      getToken: () => useAuthStore.getState().accessToken,
      onTokenExpired: async () => {
        try {
          await useAuthStore.getState().refresh();
          return true;
        } catch {
          return false;
        }
      },
    });
    setSyncClient(client);

    set({ engine, config, status: "connecting" });

    pullAllPromise = pullAll(client)
      .then(() => {
        set({ status: "connected" });
      })
      .catch((err) => {
        console.error("pullAll failed:", err);
        set({ status: "error" });
      })
      .finally(() => {
        pullAllPromise = null;
      });
  },

  disconnect: () => {
    get().engine?.disconnect();
    set({ engine: null, config: null, status: "disconnected" });
  },

  setStatus: (status: SyncStatus) => {
    set({ status });
  },

  getNoteDoc: (noteId: string) => {
    const engine = get().engine;
    if (!engine) return null;
    return engine.getNoteDoc(noteId);
  },
}));
