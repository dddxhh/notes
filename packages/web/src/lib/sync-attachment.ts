import { SyncClient } from "./sync-client";
import type { Attachment, Note } from "@notes/core";
import { getStorage } from "./sqlite-init";

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
        batch.map(async ({ client, att, file }) => {
          try {
            const storage = getStorage();
            const note = await storage.getNote(att.noteId);
            if (note) {
              await client
                .pushMetadata({
                  notes: [
                    {
                      id: note.id,
                      title: note.title,
                      folderId: note.folderId,
                      type: note.type,
                      createdAt: note.createdAt,
                      updatedAt: note.updatedAt,
                      deletedAt: note.deletedAt,
                      version: note.version,
                      isOwner: true,
                      sharePermission: null,
                    },
                  ],
                })
                .catch((err) => {
                  console.warn("Failed to push note before attachment upload:", err);
                });
            }
            await client.uploadAttachment(
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
            );
          } catch (err) {
            console.error("Failed to upload attachment:", att.id, err);
          }
        }),
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
