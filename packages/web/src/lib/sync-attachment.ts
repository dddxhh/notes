import { SyncClient, AttachmentMetadata } from "./sync-client";
import type { Attachment } from "@notes/core";

const MAX_CONCURRENT_UPLOADS = 3;
const uploadQueue: Array<{ client: SyncClient; att: Attachment; file: File }> = [];
let isProcessing = false;

export async function upload(client: SyncClient, att: Attachment, file: File): Promise<void> {
  uploadQueue.push({ client, att, file });
  await processUploadQueue();
}

async function processUploadQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (uploadQueue.length > 0) {
      const batch = uploadQueue.splice(0, MAX_CONCURRENT_UPLOADS);
      await Promise.all(
        batch.map(({ client, att, file }) =>
          client
            .uploadAttachment(
              {
                id: att.id,
                noteId: att.noteId,
                type: att.type,
                filename: att.filename,
                mimeType: att.mimeType,
                size: att.size,
                createdAt: att.createdAt,
              },
              file,
            )
            .catch((err) => {
              console.error("Failed to upload attachment:", att.id, err);
            }),
        ),
      );
    }
  } finally {
    isProcessing = false;
  }
}

export async function download(client: SyncClient, id: string): Promise<Blob | null> {
  try {
    return await client.downloadAttachment(id);
  } catch (err) {
    console.error("Failed to download attachment:", id, err);
    return null;
  }
}
