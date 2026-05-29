import { SyncClient, MetadataBatch, NoteMetadata } from "./sync-client";
import { getStorage } from "../lib";
import { useNotesStore, useFoldersStore, useTagsStore } from "../stores";
import type { Note, Folder, Tag } from "@notes/core";

let isPulling = false;

export function isPullingFromRemote(): boolean {
  return isPulling;
}

interface QueueItem {
  type: "note" | "folder" | "tag" | "deleteNote" | "deleteFolder" | "deleteTag" | "noteTags";
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

export async function pullAll(client: SyncClient): Promise<void> {
  isPulling = true;
  try {
    const remote = await client.pullMetadata();
    const storage = getStorage();

    const localFolders = await storage.listFolders();
    const localFolderMap = new Map(localFolders.map((f) => [f.id, f]));
    const remoteFolderIds = new Set(remote.folders.map((f) => f.id));

    for (const rf of remote.folders) {
      const lf = localFolderMap.get(rf.id);
      if (!lf) {
        await storage.createFolder({
          name: rf.name,
          parentId: rf.parentId,
          sortOrder: rf.sortOrder,
          _skipSync: true,
        } as any);
      } else if (rf.updatedAt > lf.updatedAt) {
        await storage.updateFolder(lf.id, {
          name: rf.name,
          parentId: rf.parentId,
          sortOrder: rf.sortOrder,
          _skipSync: true,
        } as any);
      }
    }

    for (const lf of localFolders) {
      if (!remoteFolderIds.has(lf.id)) {
        pushQueue.enqueue({ type: "folder", data: lf, entityId: lf.id });
      }
    }

    const localNotes = await storage.listNotes();
    const localNoteMap = new Map(localNotes.map((n) => [n.id, n]));
    const remoteNoteIds = new Set(remote.notes.map((n) => n.id));

    for (const rn of remote.notes) {
      const ln = localNoteMap.get(rn.id);
      if (!ln) {
        // Remote note doesn't exist locally - will be synced via Yjs
      } else if (rn.updatedAt > ln.updatedAt) {
        await storage.updateNote(ln.id, {
          title: rn.title,
          folderId: rn.folderId,
          type: rn.type as any,
          deletedAt: rn.deletedAt,
          _skipSync: true,
        } as any);
      }
    }

    for (const ln of localNotes) {
      if (!remoteNoteIds.has(ln.id)) {
        pushQueue.enqueue({ type: "note", data: ln, entityId: ln.id });
      }
    }

    const localTags = await storage.listTags();
    const localTagMap = new Map(localTags.map((t) => [t.id, t]));
    const remoteTagIds = new Set(remote.tags.map((t) => t.id));

    for (const rt of remote.tags) {
      if (!localTagMap.has(rt.id)) {
        await storage.createTag(rt.name);
      }
    }

    for (const lt of localTags) {
      if (!remoteTagIds.has(lt.id)) {
        pushQueue.enqueue({ type: "tag", data: lt, entityId: lt.id });
      }
    }

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

let clientInstance: SyncClient | null = null;

export function setSyncClient(client: SyncClient): void {
  clientInstance = client;
}

function getClient(): SyncClient {
  if (!clientInstance) throw new Error("SyncClient not initialized");
  return clientInstance;
}
