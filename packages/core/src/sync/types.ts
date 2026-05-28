export type SyncStatus = "disconnected" | "connecting" | "connected" | "syncing" | "error";

export interface SyncConfig {
  serverUrl: string;
  token: string;
  attachmentStrategy: "full" | "on-demand" | { maxSizeMB: number };
}

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
}
