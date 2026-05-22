import { useState, useEffect } from "react";
import { getStorage } from "../lib/sqlite-init";

interface IntegrityResult {
  missingAttachments: string[];
  checked: boolean;
}

export function useAttachmentIntegrity() {
  const [result, setResult] = useState<IntegrityResult>({
    missingAttachments: [],
    checked: false,
  });

  useEffect(() => {
    const checkIntegrity = async () => {
      try {
        const storage = getStorage();
        const ids = await storage.listAttachmentIds();
        const missing: string[] = [];
        for (const id of ids) {
          try {
            const blob = await storage.getAttachmentBlob(id);
            if (blob === null) {
              missing.push(id);
            }
          } catch {}
        }
        setResult({ missingAttachments: missing, checked: true });
      } catch {
        setResult({ missingAttachments: [], checked: true });
      }
    };
    checkIntegrity();
  }, []);

  return result;
}
