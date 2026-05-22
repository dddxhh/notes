import { useCallback } from "react";
import { getStorage } from "../lib/sqlite-init";
import { validateFile, compressImage } from "@notes/core";
import { useAttachmentsStore } from "../stores";
import type { Attachment } from "@notes/core";

interface UploadResult {
  success: boolean;
  attachment?: Attachment;
  error?: string;
}

export function useAttachmentUpload(noteId: string) {
  const addAttachment = useAttachmentsStore((s) => s.addAttachment);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult> => {
      const validation = validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      let processedFile = file;
      if (validation.needsCompress) {
        try {
          processedFile = await compressImage(file);
        } catch {
          processedFile = file;
        }
      }

      try {
        const storage = getStorage();
        const attachment = await storage.saveAttachment(noteId, processedFile, validation.type!);
        addAttachment(attachment);
        return { success: true, attachment };
      } catch (e) {
        return { success: false, error: `上传失败: ${e}` };
      }
    },
    [noteId, addAttachment]
  );

  return { uploadFile };
}

export type { UploadResult };