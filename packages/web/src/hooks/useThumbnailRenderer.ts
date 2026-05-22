import { useState, useEffect } from "react";
import { getStorage } from "../lib";

export function useThumbnailRenderer(attachmentId: string): {
  thumbnailSrc: string | null;
  error: boolean;
} {
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!attachmentId) {
      setThumbnailSrc(null);
      setError(false);
      return;
    }

    let cancelled = false;

    getStorage()
      .getAttachmentThumbnail(attachmentId)
      .then((blob) => {
        if (cancelled) return;
        if (blob) {
          const url = URL.createObjectURL(blob);
          setThumbnailSrc(url);
          setError(false);
        } else {
          setThumbnailSrc(null);
          setError(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setThumbnailSrc(null);
        setError(true);
      });

    return () => {
      cancelled = true;
      if (thumbnailSrc) {
        URL.revokeObjectURL(thumbnailSrc);
      }
    };
  }, [attachmentId]);

  return { thumbnailSrc, error };
}
