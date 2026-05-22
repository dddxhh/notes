import { useState, useEffect } from "react";
import {
  isAttachmentSrc,
  parseAttachmentId,
  resolveAttachmentSrc,
} from "../lib/attachment-protocol";
import { getStorage } from "../lib";

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
    resolveAttachmentSrc(src, (attachmentId: string) =>
      getStorage().getAttachmentBlob(attachmentId),
    )
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
