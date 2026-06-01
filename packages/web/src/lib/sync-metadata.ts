import { SyncClient, MetadataBatch, NoteMetadata } from "./sync-client";
import { getStorage } from "../lib";
import { useNotesStore, useFoldersStore, useTagsStore } from "../stores";
import type { Note, Folder, Tag } from "@notes/core";

let isPulling = false;

export function isPullingFromRemote(): boolean {
  return isPulling;
}

interface QueueItem {
  type:
    | "note"
    | "folder"
    | "tag"
    | "deleteNote"
    | "deleteFolder"
    | "deleteTag"
    | "deleteAttachment"
    | "noteTags";
  data: any;
  entityId?: string;
}

class PushQueue {
  private queue: QueueItem[] = [];

  enqueue(item: QueueItem): void {
    if (item.entityId) {
      const existingIndex = this.queue.findIndex(
        (q) => q.entityId === item.entityId && q.type === item.type,
      );
      if (existingIndex !== -1) {
        this.queue[existingIndex] = item;
        return;
      }
    }
    this.queue.push(item);
  }

  async flush(client: SyncClient): Promise<void> {
    if (this.queue.length === 0) return;

    const batch: MetadataBatch = {};

    for (const item of this.queue) {
      switch (item.type) {
        case "note":
          batch.notes = batch.notes || [];
          batch.notes.push(item.data);
          break;
        case "folder":
          batch.folders = batch.folders || [];
          batch.folders.push(item.data);
          break;
        case "tag":
          batch.tags = batch.tags || [];
          batch.tags.push(item.data);
          break;
        case "deleteNote":
          batch.deletedNoteIds = batch.deletedNoteIds || [];
          batch.deletedNoteIds.push(item.data);
          break;
        case "deleteFolder":
          batch.deletedFolderIds = batch.deletedFolderIds || [];
          batch.deletedFolderIds.push(item.data);
          break;
        case "deleteTag":
          batch.deletedTagIds = batch.deletedTagIds || [];
          batch.deletedTagIds.push(item.data);
          break;
        case "deleteAttachment":
          batch.deletedAttachmentIds = batch.deletedAttachmentIds || [];
          batch.deletedAttachmentIds.push(item.data);
          break;
        case "noteTags":
          batch.noteTags = batch.noteTags || [];
          batch.noteTags.push(...item.data);
          break;
      }
    }

    try {
      await client.pushMetadata(batch);
      this.queue.length = 0;
    } catch (err) {
      console.error("Failed to flush push queue:", err);
    }
  }

  get length(): number {
    return this.queue.length;
  }
}

export const pushQueue = new PushQueue();

/**
 * Incremental merge: idempotent, safe to call multiple times.
 * - Remote is source of truth for IDs
 * - Local items with same name but different ID get remapped to remote ID
 * - Local-only items get pushed to server
 */
export async function pullAll(client: SyncClient): Promise<void> {
  isPulling = true;
  try {
    const storage = getStorage();
    const remote = await client.pullMetadata();

    // --- FOLDERS ---
    const localFolders = await storage.listFolders();
    const localFolderById = new Map(localFolders.map((f) => [f.id, f]));
    const seenFolderIds = new Set<string>();

    for (const rf of remote.folders) {
      if (localFolderById.has(rf.id)) {
        // Same ID exists locally - update if remote is newer
        seenFolderIds.add(rf.id);
        const lf = localFolderById.get(rf.id)!;
        if (rf.updatedAt > lf.updatedAt) {
          await storage.updateFolder(rf.id, {
            name: rf.name,
            parentId: rf.parentId,
            sortOrder: rf.sortOrder,
          });
        }
      } else {
        // Remote folder ID not found locally
        // Check if a local folder with same (name, parentId) exists (ID mismatch)
        const matchingLocal = localFolders.find(
          (lf) =>
            lf.name === rf.name &&
            (lf.parentId ?? null) === (rf.parentId ?? null) &&
            !seenFolderIds.has(lf.id),
        );

        if (matchingLocal) {
          // ID mismatch: delete old local folder, recreate with remote ID
          const oldId = matchingLocal.id;
          seenFolderIds.add(oldId);

          // Move notes from old folder to "no folder" temporarily
          const notesInFolder = await storage.listNotes(oldId);
          await storage.deleteFolder(oldId);
          await storage.createFolder({
            id: rf.id,
            name: rf.name,
            parentId: rf.parentId,
            sortOrder: rf.sortOrder,
          });
          // Reassign notes to new folder ID
          for (const note of notesInFolder) {
            await storage.updateNote(note.id, { folderId: rf.id });
          }
        } else {
          // No matching local folder - create with remote ID
          await storage.createFolder({
            id: rf.id,
            name: rf.name,
            parentId: rf.parentId,
            sortOrder: rf.sortOrder,
          });
        }
        seenFolderIds.add(rf.id);
      }
    }

    // Queue local-only folders for push
    const currentLocalFolders = await storage.listFolders();
    const remoteFolderIds = new Set(remote.folders.map((f) => f.id));
    for (const lf of currentLocalFolders) {
      if (!remoteFolderIds.has(lf.id)) {
        pushQueue.enqueue({ type: "folder", data: lf, entityId: lf.id });
      }
    }

    // --- NOTES ---
    const allLocalNotes = await storage.listAllNotes();
    const localNoteById = new Map(allLocalNotes.map((n) => [n.id, n]));
    const seenNoteIds = new Set<string>();
    const claimedLocalNoteIds = new Set<string>();

    for (const rn of remote.notes) {
      if (localNoteById.has(rn.id)) {
        seenNoteIds.add(rn.id);
        const ln = localNoteById.get(rn.id)!;
        if (rn.updatedAt > ln.updatedAt) {
          await storage.updateNote(rn.id, {
            title: rn.title,
            folderId: rn.folderId,
            type: rn.type as any,
            deletedAt: rn.deletedAt,
          });
        } else if (ln.deletedAt && !rn.deletedAt) {
          // Local is deleted but remote isn't - push soft-delete
          pushQueue.enqueue({ type: "deleteNote", data: rn.id, entityId: rn.id });
        }
      } else {
        // Remote note not found locally by ID
        // Check if a local note with same (title, folderId) exists (ID mismatch)
        const matchingLocal = allLocalNotes.find(
          (ln) =>
            ln.title === rn.title &&
            (ln.folderId ?? null) === (rn.folderId ?? null) &&
            !seenNoteIds.has(ln.id) &&
            !claimedLocalNoteIds.has(ln.id) &&
            !ln.deletedAt,
        );

        if (matchingLocal) {
          // ID mismatch: remote is likely a placeholder, local has the real data
          // Delete remote placeholder and queue local note for push
          pushQueue.enqueue({ type: "deleteNote", data: rn.id, entityId: rn.id });
          pushQueue.enqueue({
            type: "note",
            data: matchingLocal,
            entityId: matchingLocal.id,
          });
          claimedLocalNoteIds.add(matchingLocal.id);
          seenNoteIds.add(matchingLocal.id);
        } else if (!rn.deletedAt) {
          // No matching local note and remote isn't deleted - create with remote ID
          await storage.createNote({
            id: rn.id,
            title: rn.title,
            folderId: rn.folderId,
            type: rn.type as any,
          });
        }
        seenNoteIds.add(rn.id);
      }
    }

    // Queue local-only notes for push (only non-deleted)
    const currentLocalNotes = await storage.listNotes();
    const remoteNoteIds = new Set(remote.notes.map((n) => n.id));
    for (const ln of currentLocalNotes) {
      if (!remoteNoteIds.has(ln.id)) {
        pushQueue.enqueue({ type: "note", data: ln, entityId: ln.id });
      }
    }

    // --- TAGS ---
    const localTags = await storage.listTags();
    const localTagByName = new Map(localTags.map((t) => [t.name, t]));
    const seenTagIds = new Set<string>();

    for (const rt of remote.tags) {
      const lt = localTagByName.get(rt.name);
      if (lt) {
        seenTagIds.add(lt.id);
        if (lt.id !== rt.id) {
          // Same name, different ID - remap: delete old, create with remote ID
          // First update all note-tag references
          const notesWithOldTag = await storage.getNotesForTag(lt.id);
          await storage.deleteTag(lt.id);
          await storage.createTag(rt.name, rt.id);
          for (const note of notesWithOldTag) {
            try {
              await storage.addTagsToNote(note.id, [rt.id]);
            } catch {}
          }
        }
      } else {
        // Tag not found locally - create with remote ID
        await storage.createTag(rt.name, rt.id);
      }
      seenTagIds.add(rt.id);
    }

    // Queue local-only tags for push
    const currentLocalTags = await storage.listTags();
    const remoteTagIds = new Set(remote.tags.map((t) => t.id));
    for (const lt of currentLocalTags) {
      if (!remoteTagIds.has(lt.id)) {
        pushQueue.enqueue({ type: "tag", data: lt, entityId: lt.id });
      }
    }

    // --- NOTE-TAGS ---
    for (const rnt of remote.noteTags) {
      try {
        const existingTags = await storage.getTagsForNote(rnt.noteId);
        if (!existingTags.some((t) => t.id === rnt.tagId)) {
          await storage.addTagsToNote(rnt.noteId, [rnt.tagId]);
        }
      } catch {}
    }

    // --- PUSH LOCAL-ONLY DATA ---
    try {
      await pushQueue.flush(client);
    } catch (err) {
      console.warn("Failed to push local data:", err);
    }

    // --- SHARED NOTES ---
    const sharedNoteMetas = remote.notes.filter((n) => !n.isOwner);
    const sharedNotes: Note[] = [];
    const sharedNotePermissions = new Map<string, "read" | "write">();
    for (const sn of sharedNoteMetas) {
      const local = await storage.getNote(sn.id);
      if (local) {
        sharedNotes.push(local);
        if (sn.sharePermission === "read" || sn.sharePermission === "write") {
          sharedNotePermissions.set(sn.id, sn.sharePermission);
        }
      }
    }
    useNotesStore.getState().setSharedNotes(sharedNotes);
    useNotesStore.getState().setSharedNotePermissions(sharedNotePermissions);

    // --- REFRESH STORES ---
    useNotesStore.getState().setNotes(await storage.listNotes());
    useFoldersStore.getState().setFolders(await storage.listFolders());
    useTagsStore.getState().setTags(await storage.listTags());
  } finally {
    isPulling = false;
  }
}

export async function pushNote(note: Note): Promise<void> {
  const client = getClient();
  await client.pushMetadata({
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
  });
}

export async function pushFolder(folder: Folder): Promise<void> {
  const client = getClient();
  await client.pushMetadata({ folders: [folder] });
}

export async function pushTag(tag: Tag): Promise<void> {
  const client = getClient();
  await client.pushMetadata({ tags: [tag] });
}

export async function pushDeleteNote(noteId: string): Promise<void> {
  const client = getClient();
  await client.pushMetadata({ deletedNoteIds: [noteId] });
}

export async function pushDeleteFolder(folderId: string): Promise<void> {
  const client = getClient();
  await client.pushMetadata({ deletedFolderIds: [folderId] });
}

export async function pushDeleteTag(tagId: string): Promise<void> {
  const client = getClient();
  await client.pushMetadata({ deletedTagIds: [tagId] });
}

export async function pushNoteTags(noteId: string, tagIds: string[]): Promise<void> {
  const client = getClient();
  await client.pushMetadata({
    noteTags: tagIds.map((tagId) => ({ noteId, tagId })),
  });
}

export async function pushDeleteAttachment(attachmentId: string): Promise<void> {
  const client = getClient();
  await client.pushMetadata({ deletedAttachmentIds: [attachmentId] });
}

let clientInstance: SyncClient | null = null;

export function setSyncClient(client: SyncClient): void {
  clientInstance = client;
}

function getClient(): SyncClient {
  if (!clientInstance) throw new Error("SyncClient not initialized");
  return clientInstance;
}
