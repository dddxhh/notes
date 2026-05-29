# Client Sync Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable cross-device synchronization by integrating the client with server APIs for metadata, content (via Yjs), and attachments.

**Architecture:** Implement a three-layer sync system: (1) REST client for metadata/attachments with offline queue, (2) useStorage hook interception to push local changes to server, (3) y-prosemirror integration for real-time collaborative editing. All operations are transparent to existing components.

**Tech Stack:** TypeScript, Yjs, y-websocket, y-prosemirror, TipTap Collaboration extensions, IndexedDB, Zustand

---

## File Structure

### New Files

- `packages/web/src/lib/sync-client.ts` - REST API client with auth and token refresh
- `packages/web/src/lib/sync-metadata.ts` - Metadata sync logic (pull/push/merge/queue)
- `packages/web/src/lib/sync-attachment.ts` - Attachment upload/download with concurrency control
- `packages/web/src/lib/sync-client.test.ts` - Tests for REST client
- `packages/web/src/lib/sync-metadata.test.ts` - Tests for metadata sync
- `packages/web/src/lib/sync-attachment.test.ts` - Tests for attachment sync

### Modified Files

- `packages/core/src/storage/adapter.ts` - Add `saveAttachmentBlob` method
- `packages/core/src/storage/web-adapter.ts` - Implement `saveAttachmentBlob`
- `packages/web/src/hooks/useStorage.ts` - Add sync push calls after each CRUD operation
- `packages/web/src/hooks/useAttachmentUpload.ts` - Push attachments to server after upload
- `packages/web/src/hooks/useAttachmentRenderer.ts` - Download from server when local blob missing
- `packages/web/src/components/shared/Editor.tsx` - Integrate y-prosemirror Collaboration extensions
- `packages/web/src/lib/tiptap-setup.ts` - Import Collaboration extensions
- `packages/web/src/lib/sync-engine.ts` - Add `getProvider` method

---

## P6.6: REST Client + Metadata Sync Logic

### Task 1: StorageAdapter Extension

**Files:**

- Modify: `packages/core/src/storage/adapter.ts:35-39`
- Modify: `packages/core/src/storage/web-adapter.ts` (add method implementation)

- [ ] **Step 1: Add saveAttachmentBlob to StorageAdapter interface**

Open `packages/core/src/storage/adapter.ts` and add after line 39 (after `listAttachmentIds`):

```typescript
  saveAttachmentBlob(id: string, blob: Blob): Promise<void>;
```

- [ ] **Step 2: Implement saveAttachmentBlob in WebStorageAdapter**

Open `packages/core/src/storage/web-adapter.ts` and add this method after `listAttachmentIds`:

```typescript
  async saveAttachmentBlob(id: string, blob: Blob): Promise<void> {
    await saveBlob(id, blob);
  }
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors)

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/storage/adapter.ts packages/core/src/storage/web-adapter.ts
git commit -m "feat(core): add saveAttachmentBlob to StorageAdapter"
```

---

### Task 2: REST Client Foundation

**Files:**

- Create: `packages/web/src/lib/sync-client.ts`
- Create: `packages/web/src/lib/sync-client.test.ts`

- [ ] **Step 1: Write failing test for SyncClient**

Create `packages/web/src/lib/sync-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncClient, MetadataSyncResponse, MetadataBatch } from "./sync-client";

describe("SyncClient", () => {
  let client: SyncClient;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockGetToken: ReturnType<typeof vi.fn>;
  let mockOnTokenExpired: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockGetToken = vi.fn().mockReturnValue("test-token");
    mockOnTokenExpired = vi.fn().mockResolvedValue(true);
    global.fetch = mockFetch;

    client = new SyncClient({
      serverUrl: "http://localhost:3001",
      getToken: mockGetToken,
      onTokenExpired: mockOnTokenExpired,
    });
  });

  it("should pull metadata with auth header", async () => {
    const mockResponse: MetadataSyncResponse = {
      notes: [],
      folders: [],
      tags: [],
      noteTags: [],
      attachments: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await client.pullMetadata();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/metadata/sync",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("should push metadata batch", async () => {
    const batch: MetadataBatch = {
      notes: [
        {
          id: "note-1",
          title: "Test",
          folderId: null,
          type: "rich",
          createdAt: 1000,
          updatedAt: 1000,
          deletedAt: null,
          version: 1,
          isOwner: true,
          sharePermission: null,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await client.pushMetadata(batch);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/metadata/batch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(batch),
      }),
    );
  });

  it("should retry with refreshed token on 401", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 }).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ notes: [], folders: [], tags: [], noteTags: [], attachments: [] }),
    });

    mockGetToken.mockReturnValueOnce("old-token").mockReturnValueOnce("new-token");

    await client.pullMetadata();

    expect(mockOnTokenExpired).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @notes/web test sync-client.test.ts`
Expected: FAIL with "Cannot find module './sync-client'"

- [ ] **Step 3: Implement SyncClient**

Create `packages/web/src/lib/sync-client.ts`:

```typescript
export interface NoteMetadata {
  id: string;
  title: string;
  folderId: string | null;
  type: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  version: number;
  isOwner: boolean;
  sharePermission: string | null;
}

export interface AttachmentMetadata {
  id: string;
  noteId: string;
  type: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface MetadataSyncResponse {
  notes: NoteMetadata[];
  folders: Folder[];
  tags: Tag[];
  noteTags: { noteId: string; tagId: string }[];
  attachments: AttachmentMetadata[];
}

export interface MetadataBatch {
  notes?: NoteMetadata[];
  folders?: Folder[];
  tags?: Tag[];
  noteTags?: { noteId: string; tagId: string }[];
  deletedNoteIds?: string[];
  deletedFolderIds?: string[];
  deletedTagIds?: string[];
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface Tag {
  id: string;
  name: string;
}

interface SyncClientOptions {
  serverUrl: string;
  getToken: () => string | null;
  onTokenExpired: () => Promise<boolean>;
}

export class SyncClient {
  private serverUrl: string;
  private getToken: () => string | null;
  private onTokenExpired: () => Promise<boolean>;

  constructor(opts: SyncClientOptions) {
    this.serverUrl = opts.serverUrl;
    this.getToken = opts.getToken;
    this.onTokenExpired = opts.onTokenExpired;
  }

  private async request<T>(path: string, opts?: RequestInit): Promise<T> {
    const token = this.getToken();
    if (!token) throw new Error("Not authenticated");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts?.headers,
    };

    let res = await fetch(`${this.serverUrl}${path}`, { ...opts, headers });

    if (res.status === 401) {
      const refreshed = await this.onTokenExpired();
      if (refreshed) {
        const newToken = this.getToken();
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(`${this.serverUrl}${path}`, { ...opts, headers });
      } else {
        throw new Error("Token expired and refresh failed");
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || `Request failed: ${res.status}`);
    }

    return res.json();
  }

  async pullMetadata(): Promise<MetadataSyncResponse> {
    return this.request<MetadataSyncResponse>("/api/v1/metadata/sync");
  }

  async pushMetadata(batch: MetadataBatch): Promise<void> {
    await this.request("/api/v1/metadata/batch", {
      method: "POST",
      body: JSON.stringify(batch),
    });
  }

  async uploadAttachment(meta: AttachmentMetadata, blob: Blob): Promise<{ id: string }> {
    const token = this.getToken();
    if (!token) throw new Error("Not authenticated");

    const formData = new FormData();
    formData.append("meta", JSON.stringify(meta));
    formData.append("file", blob, meta.filename);

    const res = await fetch(`${this.serverUrl}/api/v1/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  }

  async downloadAttachment(id: string): Promise<Blob> {
    const token = this.getToken();
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(`${this.serverUrl}/api/v1/attachments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Download failed");
    return res.blob();
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.request(`/api/v1/attachments/${id}`, { method: "DELETE" });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @notes/web test sync-client.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/sync-client.ts packages/web/src/lib/sync-client.test.ts
git commit -m "feat(web): add SyncClient for REST API with auth and token refresh"
```

---

### Task 3: Metadata Sync Logic

**Files:**

- Create: `packages/web/src/lib/sync-metadata.ts`
- Create: `packages/web/src/lib/sync-metadata.test.ts`

- [ ] **Step 1: Write failing test for pullAll**

Create `packages/web/src/lib/sync-metadata.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { pullAll, pushNote, pushQueue, isPullingFromRemote } from "./sync-metadata";
import { SyncClient, MetadataSyncResponse } from "./sync-client";
import { getStorage } from "../lib";
import { useNotesStore, useFoldersStore, useTagsStore } from "../stores";

vi.mock("../lib", () => ({
  getStorage: vi.fn(),
}));

vi.mock("../stores", () => ({
  useNotesStore: { getState: vi.fn() },
  useFoldersStore: { getState: vi.fn() },
  useTagsStore: { getState: vi.fn() },
}));

describe("sync-metadata", () => {
  let mockClient: SyncClient;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      listFolders: vi.fn().mockResolvedValue([]),
      listNotes: vi.fn().mockResolvedValue([]),
      listTags: vi.fn().mockResolvedValue([]),
      createFolder: vi.fn().mockResolvedValue({}),
      updateFolder: vi.fn().mockResolvedValue({}),
    };

    vi.mocked(getStorage).mockReturnValue(mockStorage);
    vi.mocked(useNotesStore.getState).mockReturnValue({ setNotes: vi.fn() } as any);
    vi.mocked(useFoldersStore.getState).mockReturnValue({ setFolders: vi.fn() } as any);
    vi.mocked(useTagsStore.getState).mockReturnValue({ setTags: vi.fn() } as any);

    mockClient = {
      pullMetadata: vi.fn(),
      pushMetadata: vi.fn(),
    } as any;
  });

  it("should pull remote folders and create locally when missing", async () => {
    const remoteData: MetadataSyncResponse = {
      notes: [],
      folders: [
        {
          id: "folder-1",
          name: "Remote Folder",
          parentId: null,
          sortOrder: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      tags: [],
      noteTags: [],
      attachments: [],
    };

    vi.mocked(mockClient.pullMetadata).mockResolvedValue(remoteData);

    await pullAll(mockClient);

    expect(mockStorage.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Remote Folder",
        _skipSync: true,
      }),
    );
  });

  it("should set isPulling flag during pullAll", async () => {
    vi.mocked(mockClient.pullMetadata).mockResolvedValue({
      notes: [],
      folders: [],
      tags: [],
      noteTags: [],
      attachments: [],
    });

    expect(isPullingFromRemote()).toBe(false);
    const promise = pullAll(mockClient);
    expect(isPullingFromRemote()).toBe(true);
    await promise;
    expect(isPullingFromRemote()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @notes/web test sync-metadata.test.ts`
Expected: FAIL with "Cannot find module './sync-metadata'"

- [ ] **Step 3: Implement sync-metadata.ts**

Create `packages/web/src/lib/sync-metadata.ts`:

```typescript
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

    // Merge folders
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

    // Merge notes (similar logic)
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

    // Merge tags
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

    // Refresh stores
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @notes/web test sync-metadata.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/sync-metadata.ts packages/web/src/lib/sync-metadata.test.ts
git commit -m "feat(web): add metadata sync logic with offline queue"
```

---

## P6.7: useStorage Hook Integration

### Task 4: Integrate Sync Push into useStorage

**Files:**

- Modify: `packages/web/src/hooks/useStorage.ts`

- [ ] **Step 1: Add imports to useStorage.ts**

Open `packages/web/src/hooks/useStorage.ts` and add at the top (after line 15):

```typescript
import { useSyncStore } from "../stores/syncStore";
import {
  pushNote,
  pushFolder,
  pushTag,
  pushDeleteNote,
  pushDeleteFolder,
  pushDeleteTag,
  pushNoteTags,
  pushQueue,
  isPullingFromRemote,
} from "../lib/sync-metadata";
```

- [ ] **Step 2: Update createNote to push after local write**

Replace the `createNote` function (lines 18-20) with:

```typescript
const createNote = useCallback(async (input: CreateNoteInput): Promise<Note> => {
  const note = await getStorage().createNote(input);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushNote(note).catch(() => {
      pushQueue.enqueue({ type: "note", data: note, entityId: note.id });
    });
  }
  return note;
}, []);
```

- [ ] **Step 3: Update updateNote to push after local write**

Replace the `updateNote` function (lines 22-24) with:

```typescript
const updateNote = useCallback(async (id: string, input: UpdateNoteInput): Promise<Note> => {
  const note = await getStorage().updateNote(id, input);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushNote(note).catch(() => {
      pushQueue.enqueue({ type: "note", data: note, entityId: note.id });
    });
  }
  return note;
}, []);
```

- [ ] **Step 4: Update deleteNote to push after local delete**

Replace the `deleteNote` function (lines 26-28) with:

```typescript
const deleteNote = useCallback(async (id: string): Promise<void> => {
  await getStorage().deleteNote(id);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushDeleteNote(id).catch(() => {
      pushQueue.enqueue({ type: "deleteNote", data: id, entityId: id });
    });
  }
}, []);
```

- [ ] **Step 5: Update createFolder to push after local write**

Replace the `createFolder` function (lines 38-40) with:

```typescript
const createFolder = useCallback(async (input: CreateFolderInput): Promise<Folder> => {
  const folder = await getStorage().createFolder(input);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushFolder(folder).catch(() => {
      pushQueue.enqueue({ type: "folder", data: folder, entityId: folder.id });
    });
  }
  return folder;
}, []);
```

- [ ] **Step 6: Update updateFolder to push after local write**

Replace the `updateFolder` function (lines 42-47) with:

```typescript
const updateFolder = useCallback(async (id: string, input: UpdateFolderInput): Promise<Folder> => {
  const folder = await getStorage().updateFolder(id, input);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushFolder(folder).catch(() => {
      pushQueue.enqueue({ type: "folder", data: folder, entityId: folder.id });
    });
  }
  return folder;
}, []);
```

- [ ] **Step 7: Update deleteFolder to push after local delete**

Replace the `deleteFolder` function (lines 49-51) with:

```typescript
const deleteFolder = useCallback(async (id: string): Promise<void> => {
  await getStorage().deleteFolder(id);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushDeleteFolder(id).catch(() => {
      pushQueue.enqueue({ type: "deleteFolder", data: id, entityId: id });
    });
  }
}, []);
```

- [ ] **Step 8: Update createTag to push after local write**

Replace the `createTag` function (lines 57-59) with:

```typescript
const createTag = useCallback(async (name: string): Promise<Tag> => {
  const tag = await getStorage().createTag(name);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushTag(tag).catch(() => {
      pushQueue.enqueue({ type: "tag", data: tag, entityId: tag.id });
    });
  }
  return tag;
}, []);
```

- [ ] **Step 9: Update deleteTag to push after local delete**

Replace the `deleteTag` function (lines 84-86) with:

```typescript
const deleteTag = useCallback(async (id: string): Promise<void> => {
  await getStorage().deleteTag(id);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushDeleteTag(id).catch(() => {
      pushQueue.enqueue({ type: "deleteTag", data: id, entityId: id });
    });
  }
}, []);
```

- [ ] **Step 10: Update addTagsToNote to push after local write**

Replace the `addTagsToNote` function (lines 65-67) with:

```typescript
const addTagsToNote = useCallback(async (noteId: string, tagIds: string[]): Promise<void> => {
  await getStorage().addTagsToNote(noteId, tagIds);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    const allTags = await getStorage().getTagsForNote(noteId);
    pushNoteTags(
      noteId,
      allTags.map((t) => t.id),
    ).catch(() => {
      pushQueue.enqueue({
        type: "noteTags",
        data: allTags.map((t) => ({ noteId, tagId: t.id })),
        entityId: noteId,
      });
    });
  }
}, []);
```

- [ ] **Step 11: Update removeTagFromNote to push after local write**

Replace the `removeTagFromNote` function (lines 73-75) with:

```typescript
const removeTagFromNote = useCallback(async (noteId: string, tagId: string): Promise<void> => {
  await getStorage().removeTagFromNote(noteId, tagId);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    const allTags = await getStorage().getTagsForNote(noteId);
    pushNoteTags(
      noteId,
      allTags.map((t) => t.id),
    ).catch(() => {
      pushQueue.enqueue({
        type: "noteTags",
        data: allTags.map((t) => ({ noteId, tagId: t.id })),
        entityId: noteId,
      });
    });
  }
}, []);
```

- [ ] **Step 12: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors)

- [ ] **Step 13: Run existing tests**

Run: `pnpm --filter @notes/web test`
Expected: PASS (all existing tests still pass)

- [ ] **Step 14: Commit**

```bash
git add packages/web/src/hooks/useStorage.ts
git commit -m "feat(web): integrate sync push into useStorage hook"
```

---

## P6.8: y-prosemirror Integration

### Task 5: Install TipTap Collaboration Extensions

**Files:**

- Modify: `packages/web/package.json`

- [ ] **Step 1: Install collaboration dependencies**

Run: `pnpm --filter @notes/web add @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor`

- [ ] **Step 2: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add TipTap collaboration extensions"
```

---

### Task 6: SyncEngine Provider Access

**Files:**

- Modify: `packages/web/src/lib/sync-engine.ts`

- [ ] **Step 1: Add getProvider method to SyncEngine**

Open `packages/web/src/lib/sync-engine.ts` and add this method after `getNoteDoc`:

```typescript
  getProvider(noteId: string): WebsocketProvider | null {
    return this.providers.get(noteId) || null;
  }
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/lib/sync-engine.ts
git commit -m "feat(web): add getProvider method to SyncEngine"
```

---

### Task 7: Integrate y-prosemirror into Editor

**Files:**

- Modify: `packages/web/src/lib/tiptap-setup.ts`
- Modify: `packages/web/src/components/shared/Editor.tsx`

- [ ] **Step 1: Import Collaboration extensions in tiptap-setup.ts**

Open `packages/web/src/lib/tiptap-setup.ts` and add at the top (after existing imports):

```typescript
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
```

Then export them at the bottom of the file:

```typescript
export { Collaboration, CollaborationCursor };
```

- [ ] **Step 2: Update Editor.tsx imports**

Open `packages/web/src/components/shared/Editor.tsx` and add at the top:

```typescript
import { Collaboration, CollaborationCursor } from "../../lib/tiptap-setup";
import { useSyncStore } from "../../stores/syncStore";
import { useAuthStore } from "../../stores/authStore";
```

- [ ] **Step 3: Add Yjs integration logic to Editor component**

In the `Editor` function, after the existing hooks (around line 30), add:

```typescript
const isSyncEnabled = useSyncStore((s) => s.engine !== null);
const getNoteDoc = useSyncStore((s) => s.getNoteDoc);

const yjsDoc = isSyncEnabled && currentNoteId ? getNoteDoc(currentNoteId) : null;
const yjsXmlFragment = yjsDoc?.getXmlFragment("contentJson") ?? null;
```

- [ ] **Step 4: Update extensions configuration**

Replace the `extensions` configuration in `useEditor` (around line 72) with:

```typescript
    extensions: useMemo(() => {
      const base = getEditorExtensions(mobile);
      if (yjsXmlFragment) {
        const provider = useSyncStore.getState().engine?.getProvider(currentNoteId!);
        return [
          ...base,
          Collaboration.configure({ document: yjsXmlFragment }),
          ...(provider
            ? [
                CollaborationCursor.configure({
                  provider,
                  user: {
                    name: useAuthStore.getState().user?.username || "Anonymous",
                    color: "#3b82f6",
                  },
                }),
              ]
            : []),
        ];
      }
      return base;
    }, [mobile, yjsXmlFragment, currentNoteId]),
```

- [ ] **Step 5: Update content initialization**

Replace the `content` property in `useEditor` with:

```typescript
    content: yjsXmlFragment ? undefined : parsedContent,
```

- [ ] **Step 6: Update onUpdate to sync mdText**

Replace the `onUpdate` callback in `useEditor` with:

```typescript
    onUpdate: ({ editor }) => {
      const contentJson = JSON.stringify(editor.getJSON());
      const mdText = proseMirrorJSONToMarkdown(contentJson);

      if (yjsDoc) {
        const yMdText = yjsDoc.getText("mdText");
        yjsDoc.transact(() => {
          yMdText.delete(0, yMdText.length);
          yMdText.insert(0, mdText);
        });
      }

      onUpdate(contentJson, mdText);
    },
```

- [ ] **Step 7: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 8: Run tests**

Run: `pnpm --filter @notes/web test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/lib/tiptap-setup.ts packages/web/src/components/shared/Editor.tsx
git commit -m "feat(web): integrate y-prosemirror for real-time collaboration"
```

---

## P6.9: Attachment Sync

### Task 8: Attachment Sync Logic

**Files:**

- Create: `packages/web/src/lib/sync-attachment.ts`
- Create: `packages/web/src/lib/sync-attachment.test.ts`

- [ ] **Step 1: Write failing test for attachment upload**

Create `packages/web/src/lib/sync-attachment.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { upload, download } from "./sync-attachment";
import { SyncClient } from "./sync-client";

describe("sync-attachment", () => {
  let mockClient: SyncClient;

  beforeEach(() => {
    mockClient = {
      uploadAttachment: vi.fn().mockResolvedValue({ id: "att-1" }),
      downloadAttachment: vi.fn().mockResolvedValue(new Blob(["test"])),
    } as any;
  });

  it("should upload attachment to server", async () => {
    const att = {
      id: "att-1",
      noteId: "note-1",
      type: "image" as const,
      filename: "test.png",
      mimeType: "image/png",
      size: 100,
      createdAt: 1000,
    };
    const file = new File(["test"], "test.png", { type: "image/png" });

    await upload(mockClient, att, file);

    expect(mockClient.uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "att-1" }),
      file,
    );
  });

  it("should download attachment from server", async () => {
    const blob = await download(mockClient, "att-1");

    expect(mockClient.downloadAttachment).toHaveBeenCalledWith("att-1");
    expect(blob).toBeInstanceOf(Blob);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @notes/web test sync-attachment.test.ts`
Expected: FAIL with "Cannot find module './sync-attachment'"

- [ ] **Step 3: Implement sync-attachment.ts**

Create `packages/web/src/lib/sync-attachment.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @notes/web test sync-attachment.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/sync-attachment.ts packages/web/src/lib/sync-attachment.test.ts
git commit -m "feat(web): add attachment sync with concurrency control"
```

---

### Task 9: Integrate Attachment Upload Sync

**Files:**

- Modify: `packages/web/src/hooks/useAttachmentUpload.ts`

- [ ] **Step 1: Add sync imports to useAttachmentUpload.ts**

Open `packages/web/src/hooks/useAttachmentUpload.ts` and add at the top:

```typescript
import { useSyncStore } from "../stores/syncStore";
import { upload as syncUpload } from "../lib/sync-attachment";
import { SyncClient } from "../lib/sync-client";
import { useAuthStore } from "../stores/authStore";
```

- [ ] **Step 2: Add sync push after successful upload**

Find the line where `uploadFile` returns success (look for `return { success: true, attachment }` or similar). Add this code right before the return:

```typescript
if (useSyncStore.getState().engine) {
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
    syncUpload(client, attachment, file).catch(() => {});
  }
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/hooks/useAttachmentUpload.ts
git commit -m "feat(web): push attachments to server after upload"
```

---

### Task 10: Integrate Attachment Download Sync

**Files:**

- Modify: `packages/web/src/hooks/useAttachmentRenderer.ts`

- [ ] **Step 1: Add sync imports to useAttachmentRenderer.ts**

Open `packages/web/src/hooks/useAttachmentRenderer.ts` and add at the top:

```typescript
import { useSyncStore } from "../stores/syncStore";
import { download as syncDownload } from "../lib/sync-attachment";
import { SyncClient } from "../lib/sync-client";
import { useAuthStore } from "../stores/authStore";
```

- [ ] **Step 2: Add fallback download logic**

Find the section where the hook tries to get the blob from local storage (look for `getAttachmentBlob` or similar). After that check, add:

```typescript
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
    blob = await syncDownload(client, id);
    if (blob) {
      await getStorage().saveAttachmentBlob(id, blob);
    }
  }
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/hooks/useAttachmentRenderer.ts
git commit -m "feat(web): download attachments from server when missing locally"
```

---

## P6.10: Global Verification

### Task 11: Integration Testing

**Files:** None (manual testing)

- [ ] **Step 1: Start sync server**

Run: `pnpm --filter @notes/sync-server dev`

- [ ] **Step 2: Start web app**

In a new terminal, run: `pnpm --filter @notes/web dev`

- [ ] **Step 3: Test metadata sync**

1. Open browser to `http://localhost:3000`
2. Open settings panel (⚙️ button)
3. Enter server URL: `http://localhost:3001`
4. Register a new account
5. Create a note and a folder
6. Open a second browser window (or incognito)
7. Log in with the same account
8. Verify: Both windows show the same notes and folders

- [ ] **Step 4: Test content sync**

1. In the first window, open a note and start typing
2. In the second window, open the same note
3. Verify: Changes appear in real-time in both windows
4. Verify: Cursor positions are visible (collaboration cursors)

- [ ] **Step 5: Test attachment sync**

1. In the first window, upload an image to a note
2. In the second window, open the same note
3. Verify: The image appears in both windows
4. Check browser DevTools Network tab: Second window should have downloaded the image from server

- [ ] **Step 6: Test offline queue**

1. In the first window, create a new note
2. Stop the sync server (Ctrl+C)
3. In the first window, edit the note (changes should queue)
4. Restart the sync server
5. Wait for reconnection (status should change to "connected")
6. In the second window, verify: The edited note appears with changes

- [ ] **Step 7: Run full test suite**

Run: `pnpm test`
Expected: PASS (all tests)

- [ ] **Step 8: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 9: Commit any fixes**

If any issues were found during testing, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve integration issues found during testing"
```

---

## Summary

This plan implements client-side sync integration in 11 tasks across 5 phases:

- **P6.6** (Tasks 1-3): StorageAdapter extension, REST client, metadata sync logic
- **P6.7** (Task 4): useStorage hook integration with sync push
- **P6.8** (Tasks 5-7): y-prosemirror integration for real-time collaboration
- **P6.9** (Tasks 8-10): Attachment sync (upload + on-demand download)
- **P6.10** (Task 11): Global verification and integration testing

Each task is bite-sized (2-5 minutes per step), follows TDD where applicable, and includes complete code. The implementation is transparent to existing components and handles offline scenarios gracefully.
