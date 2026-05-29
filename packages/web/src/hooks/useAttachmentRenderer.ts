import { useState, useEffect } from "react";
import {
  isAttachmentSrc,
  parseAttachmentId,
  resolveAttachmentSrc,
} from "../lib/attachment-protocol";
import { getStorage } from "../lib";
import { useSyncStore } from "../stores/syncStore";
import { download as syncDownload } from "../lib/sync-attachment";
import { SyncClient } from "../lib/sync-client";
import { useAuthStore } from "../stores/authStore";

export function useAttachmentRenderer(src: string): {
  resolvedSrc: string | null;
  error: boolean;
} {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      setError(false);
      return;
    }

    if (!isAttachmentSrc(src)) {
      setResolvedSrc(src);
      setError(false);
      return;
    }

    let cancelled = false;

    const id = parseAttachmentId(src)!;
    resolveAttachmentSrc(src, async (attachmentId: string) => {
      let blob = await getStorage().getAttachmentBlob(attachmentId);

      if (!blob && useSyncStore.getState().engine) {
        const serverUrl = useAuthStore.getState().serverUrl;
        const token = useAuthStore.getState().accessToken;
        if (serverUrl && token) {
          const client = new SyncClient({
            serverUrl,
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
          blob = await syncDownload(client, attachmentId);
          if (blob) {
            await getStorage().saveAttachmentBlob(attachmentId, blob);
          }
        }
      }

      return blob;
    })
      .then((result) => {
        if (cancelled) return;
        if (result) {
          setResolvedSrc(result);
          setError(false);
        } else {
          setResolvedSrc(null);
          setError(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedSrc(null);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return { resolvedSrc, error };
}
