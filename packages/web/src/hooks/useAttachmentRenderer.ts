import { useState, useEffect } from "react";
import { isAttachmentSrc, resolveAttachmentSrc } from "../lib/attachment-protocol";
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
  const engine = useSyncStore((s) => s.engine);

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

    resolveAttachmentSrc(src, async (attachmentId: string) => {
      let blob = await getStorage().getAttachmentBlob(attachmentId);

      if (!blob && engine) {
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
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to resolve attachment:", src, err);
        setResolvedSrc(null);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src, engine]);

  return { resolvedSrc, error };
}
