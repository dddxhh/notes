import { useCallback } from "react";
import { useSyncStore } from "../stores/syncStore";
import type { SyncConfig } from "@notes/core";

export function useSync() {
  const status = useSyncStore((s) => s.status);
  const engine = useSyncStore((s) => s.engine);
  const initSync = useSyncStore((s) => s.initSync);
  const disconnect = useSyncStore((s) => s.disconnect);
  const getNoteDoc = useSyncStore((s) => s.getNoteDoc);

  const connect = useCallback(
    (config: SyncConfig) => {
      initSync(config);
    },
    [initSync],
  );

  const isSyncEnabled = engine !== null;

  return {
    status,
    isSyncEnabled,
    connect,
    disconnect,
    getNoteDoc,
  };
}
