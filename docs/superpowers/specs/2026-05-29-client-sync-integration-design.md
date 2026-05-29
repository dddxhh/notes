# 客户端同步集成设计规格

**日期:** 2026-05-29  
**状态:** 已审阅 — 待实施  
**依赖:** P6.1-P6.5 已完成（服务端 API + 基础 UI）

## 概述

P6.1-P6.5 完成了服务端基础设施（认证、Yjs WebSocket、元数据 REST API、附件 API、分享、UI 组件），但客户端尚未实际调用这些 API。本设计补全客户端的同步逻辑，使数据真正跨设备同步。

### 核心决策

| 决策项           | 选择                            | 理由                                           |
| ---------------- | ------------------------------- | ---------------------------------------------- |
| 元数据同步拦截点 | useStorage hook                 | 对现有组件完全透明，不改动 NoteView/Sidebar 等 |
| 内容同步方案     | y-prosemirror 绑定 TipTap       | Yjs 官方 ProseMirror 集成，自动处理协作编辑    |
| 附件同步策略     | 上传后推送 + 按需下载           | 避免 Yjs Doc 膨胀，大文件独立传输              |
| 离线队列策略     | 内存队列 + entityId 去重        | 简单高效，重连后批量发送                       |
| 冲突处理         | last-write-wins（服务端已实现） | 客户端 push 失败时忽略，下次 pullAll 拉取最新  |

## 1. 整体架构与数据流

### 1.1 新增文件

```
packages/web/src/lib/
├── sync-client.ts          # REST API 客户端（fetch + auth + token 刷新）
├── sync-metadata.ts        # 元数据同步逻辑（pull/push/merge/queue）
└── sync-attachment.ts      # 附件上传/下载逻辑（并发控制）
```

### 1.2 修改文件

```
packages/web/src/hooks/
├── useStorage.ts           # 拦截 CRUD 操作，追加 push 调用
├── useAttachmentUpload.ts  # 上传后推送到服务端
└── useAttachmentRenderer.ts # 本地无 blob 时从服务端下载

packages/web/src/components/shared/
└── Editor.tsx              # 接入 y-prosemirror，Yjs 模式驱动编辑器

packages/web/src/lib/
└── tiptap-setup.ts         # 新增 Collaboration/CollaborationCursor 扩展导入
```

### 1.3 登录后初始化流程

```
用户登录成功
  ↓
authStore.login() → 保存 token 到 sessionStorage
  ↓
syncStore.initSync() → 创建 SyncEngine（WebSocket 连接）
  ↓
syncMetadata.pullAll()
  ↓
GET /api/v1/metadata/sync → 返回远程 folders/notes/tags/noteTags/attachments
  ↓
与本地 wa-sqlite 合并（远程有本地无 → 写入本地；本地有远程无 → 加入 pushQueue）
  ↓
刷新 notesStore/foldersStore/tagsStore
  ↓
flushPushQueue() → POST /api/v1/metadata/batch
  ↓
状态变为 "connected"
```

### 1.4 日常操作数据流

```
用户创建笔记
  ↓
useStorage.createNote() → 本地 wa-sqlite 写入
  ↓
syncMetadata.pushNote(note) → POST /api/v1/metadata/batch
  ↓
服务端存储元数据（note_metadata 表）

用户编辑笔记内容
  ↓
TipTap onUpdate → Yjs Doc 自动同步（y-prosemirror Collaboration 扩展）
  ↓
WebSocket → 服务端 yjs_updates 表 → 其他设备

用户上传附件
  ↓
useAttachmentUpload → 本地 IndexedDB 写入
  ↓
syncAttachment.upload() → POST /api/v1/attachments（multipart）
  ↓
服务端存储文件到磁盘 + 元数据到 attachments 表

其他设备打开笔记
  ↓
useAttachmentRenderer → 本地 IndexedDB 查找 blob
  ↓
本地无 → syncAttachment.download() → GET /api/v1/attachments/:id
  ↓
缓存到本地 IndexedDB → 渲染图片/视频
```

## 2. sync-client.ts — REST API 客户端

### 2.1 类设计

```ts
// packages/web/src/lib/sync-client.ts

interface SyncClientOptions {
  serverUrl: string;
  getToken: () => string | null;
  onTokenExpired: () => Promise<boolean>; // 返回 true 表示刷新成功
}

class SyncClient {
  constructor(opts: SyncClientOptions);

  // 元数据 API
  async pullMetadata(): Promise<MetadataSyncResponse>;
  async pushMetadata(batch: MetadataBatch): Promise<void>;

  // 附件 API
  async uploadAttachment(meta: AttachmentMeta, blob: Blob): Promise<{ id: string }>;
  async downloadAttachment(id: string): Promise<Blob>;
  async deleteAttachment(id: string): Promise<void>;
}
```

### 2.2 通用请求方法

```ts
private async request<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = this.getToken();
  if (!token) throw new Error("Not authenticated");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...opts?.headers,
  };

  let res = await fetch(`${this.serverUrl}${path}`, { ...opts, headers });

  // 401 → 尝试刷新 token
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
```

### 2.3 附件上传（multipart）

```ts
async uploadAttachment(meta: AttachmentMeta, blob: Blob): Promise<{ id: string }> {
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
```

### 2.4 类型定义

```ts
interface MetadataSyncResponse {
  notes: NoteMetadata[];
  folders: Folder[];
  tags: Tag[];
  noteTags: { noteId: string; tagId: string }[];
  attachments: AttachmentMetadata[];
}

interface NoteMetadata {
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

interface AttachmentMetadata {
  id: string;
  noteId: string;
  type: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

interface MetadataBatch {
  notes?: NoteMetadata[];
  folders?: Folder[];
  tags?: Tag[];
  noteTags?: { noteId: string; tagId: string }[];
  deletedNoteIds?: string[];
  deletedFolderIds?: string[];
  deletedTagIds?: string[];
}
```

## 3. sync-metadata.ts — 元数据同步逻辑

### 3.1 pullAll — 全量拉取与合并

```ts
// packages/web/src/lib/sync-metadata.ts

export async function pullAll(client: SyncClient): Promise<void> {
  const remote = await client.pullMetadata();
  const storage = getStorage();

  // 1. 合并 folders
  const localFolders = await storage.listFolders();
  const localFolderMap = new Map(localFolders.map((f) => [f.id, f]));
  const remoteFolderIds = new Set(remote.folders.map((f) => f.id));

  for (const rf of remote.folders) {
    const lf = localFolderMap.get(rf.id);
    if (!lf) {
      // 远程有、本地无 → 写入本地
      await storage.createFolder({
        name: rf.name,
        parentId: rf.parentId,
        sortOrder: rf.sortOrder,
        _skipSync: true, // 标记跳过 push，避免循环
      });
    } else if (rf.updatedAt > lf.updatedAt) {
      // 远程更新 → 覆盖本地
      await storage.updateFolder(lf.id, {
        name: rf.name,
        parentId: rf.parentId,
        sortOrder: rf.sortOrder,
        _skipSync: true,
      });
    }
  }

  for (const lf of localFolders) {
    if (!remoteFolderIds.has(lf.id)) {
      // 本地有、远程无 → 加入 pushQueue
      pushQueue.enqueue({ type: "folder", data: lf });
    }
  }

  // 2. 合并 notes（同理，比较 updatedAt；远程有本地无 → 创建；ID 不同但同文件夹同标题 → 重映射）
  // 3. 合并 tags（按 name 去重；同名不同 ID → 删旧建新，重映射 note-tag 关联）
  // 4. 合并 noteTags（远程有本地无 → addTagsToNote）
  // 5. 推送本地独有数据（pushQueue.flush）

  // 6. 刷新 stores
  useNotesStore.getState().setNotes(await storage.listNotes());
  useFoldersStore.getState().setFolders(await storage.listFolders());
  useTagsStore.getState().setTags(await storage.listTags());
}
```

### 3.2 push 系列 — 本地变更推送

```ts
export async function pushNote(note: Note): Promise<void> {
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
  await client.pushMetadata({ folders: [folder] });
}

export async function pushTag(tag: Tag): Promise<void> {
  await client.pushMetadata({ tags: [tag] });
}

export async function pushDeleteNote(noteId: string): Promise<void> {
  await client.pushMetadata({ deletedNoteIds: [noteId] });
}

export async function pushDeleteFolder(folderId: string): Promise<void> {
  await client.pushMetadata({ deletedFolderIds: [folderId] });
}

export async function pushDeleteTag(tagId: string): Promise<void> {
  await client.pushMetadata({ deletedTagIds: [tagId] });
}

export async function pushNoteTags(noteId: string, tagIds: string[]): Promise<void> {
  await client.pushMetadata({
    noteTags: tagIds.map((tagId) => ({ noteId, tagId })),
  });
}
```

### 3.3 离线队列

```ts
interface QueueItem {
  type: "note" | "folder" | "tag" | "deleteNote" | "deleteFolder" | "deleteTag" | "noteTags";
  data: any;
  entityId?: string; // 用于去重
}

class PushQueue {
  private queue: QueueItem[] = [];

  enqueue(item: QueueItem): void {
    // 按 entityId 去重，只保留最新版本
    if (item.entityId) {
      const existingIndex = this.queue.findIndex(
        (q) => q.entityId === item.entityId && q.type === item.type,
      );
      if (existingIndex !== -1) {
        this.queue[existingIndex] = item; // 替换旧版本
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
      this.queue.length = 0; // 清空队列
    } catch (err) {
      console.error("Failed to flush push queue:", err);
      // 保留队列，下次重试
    }
  }

  get length(): number {
    return this.queue.length;
  }
}

export const pushQueue = new PushQueue();
```

### 3.4 重连时自动 flush

```ts
// packages/web/src/stores/syncStore.ts（修改）

initSync: (config: SyncConfig) => {
  const engine = new SyncEngine(config);

  engine.onStatusChange(async (status) => {
    set({ status });
    if (status === "connected") {
      // 重连后自动 flush 离线队列
      await flushPushQueue();
    }
  });

  set({ engine, config, status: "connecting" });
},
```

## 4. useStorage 拦截层集成

### 4.1 修改 useStorage.ts

```ts
// packages/web/src/hooks/useStorage.ts

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
} from "../lib/sync-metadata";

export function useStorage() {
  const createNote = useCallback(async (input: CreateNoteInput): Promise<Note> => {
    const note = await getStorage().createNote(input);
    if (useSyncStore.getState().engine) {
      pushNote(note).catch(() => {
        pushQueue.enqueue({ type: "note", data: note, entityId: note.id });
      });
    }
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, input: UpdateNoteInput): Promise<Note> => {
    const note = await getStorage().updateNote(id, input);
    if (useSyncStore.getState().engine) {
      pushNote(note).catch(() => {
        pushQueue.enqueue({ type: "note", data: note, entityId: note.id });
      });
    }
    return note;
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    await getStorage().deleteNote(id);
    if (useSyncStore.getState().engine) {
      pushDeleteNote(id).catch(() => {
        pushQueue.enqueue({ type: "deleteNote", data: id, entityId: id });
      });
    }
  }, []);

  const createFolder = useCallback(async (input: CreateFolderInput): Promise<Folder> => {
    const folder = await getStorage().createFolder(input);
    if (useSyncStore.getState().engine) {
      pushFolder(folder).catch(() => {
        pushQueue.enqueue({ type: "folder", data: folder, entityId: folder.id });
      });
    }
    return folder;
  }, []);

  const updateFolder = useCallback(
    async (id: string, input: UpdateFolderInput): Promise<Folder> => {
      const folder = await getStorage().updateFolder(id, input);
      if (useSyncStore.getState().engine) {
        pushFolder(folder).catch(() => {
          pushQueue.enqueue({ type: "folder", data: folder, entityId: folder.id });
        });
      }
      return folder;
    },
    [],
  );

  const deleteFolder = useCallback(async (id: string): Promise<void> => {
    await getStorage().deleteFolder(id);
    if (useSyncStore.getState().engine) {
      pushDeleteFolder(id).catch(() => {
        pushQueue.enqueue({ type: "deleteFolder", data: id, entityId: id });
      });
    }
  }, []);

  const createTag = useCallback(async (name: string): Promise<Tag> => {
    const tag = await getStorage().createTag(name);
    if (useSyncStore.getState().engine) {
      pushTag(tag).catch(() => {
        pushQueue.enqueue({ type: "tag", data: tag, entityId: tag.id });
      });
    }
    return tag;
  }, []);

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    await getStorage().deleteTag(id);
    if (useSyncStore.getState().engine) {
      pushDeleteTag(id).catch(() => {
        pushQueue.enqueue({ type: "deleteTag", data: id, entityId: id });
      });
    }
  }, []);

  const addTagsToNote = useCallback(async (noteId: string, tagIds: string[]): Promise<void> => {
    await getStorage().addTagsToNote(noteId, tagIds);
    if (useSyncStore.getState().engine) {
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

  const removeTagFromNote = useCallback(async (noteId: string, tagId: string): Promise<void> => {
    await getStorage().removeTagFromNote(noteId, tagId);
    if (useSyncStore.getState().engine) {
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

  // ... 其他函数保持不变
}
```

### 4.2 关键设计

- `if (useSyncStore.getState().engine)` — 只在同步启用时推送
- `.catch(() => { pushQueue.enqueue(...) })` — 推送失败时加入离线队列
- 不改变任何函数签名，现有组件无需修改

### 4.3 pullAll 时避免循环推送

pullAll 写入本地时，需要跳过 push。方案：使用模块级标志位：

```ts
// packages/web/src/lib/sync-metadata.ts

let isPulling = false;

export async function pullAll(client: SyncClient): Promise<void> {
  isPulling = true;
  try {
    // ... 合并逻辑
  } finally {
    isPulling = false;
  }
}

export function isPullingFromRemote(): boolean {
  return isPulling;
}
```

useStorage 中检查：

```ts
const createNote = useCallback(async (input: CreateNoteInput): Promise<Note> => {
  const note = await getStorage().createNote(input);
  if (useSyncStore.getState().engine && !isPullingFromRemote()) {
    pushNote(note).catch(() => { ... });
  }
  return note;
}, []);
```

## 5. 内容同步 — y-prosemirror 集成

### 5.1 Editor 组件改造

```ts
// packages/web/src/components/shared/Editor.tsx

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { useSyncStore } from "../../stores/syncStore";

export default function Editor({ content, currentNoteId, onUpdate, ... }: EditorProps) {
  const isSyncEnabled = useSyncStore((s) => s.engine !== null);
  const getNoteDoc = useSyncStore((s) => s.getNoteDoc);

  // 同步模式：获取 Yjs Doc
  const yjsDoc = isSyncEnabled && currentNoteId ? getNoteDoc(currentNoteId) : null;
  const yjsXmlFragment = yjsDoc?.getXmlFragment("contentJson") ?? null;

  // 构造扩展列表
  const extensions = useMemo(() => {
    const base = getEditorExtensions(mobile);
    if (yjsXmlFragment) {
      const provider = useSyncStore.getState().engine?.getProvider(currentNoteId!);
      return [
        ...base,
        Collaboration.configure({ document: yjsXmlFragment }),
        ...(provider ? [CollaborationCursor.configure({
          provider,
          user: { name: useAuthStore.getState().user?.username || "Anonymous", color: "#3b82f6" },
        })] : []),
      ];
    }
    return base;
  }, [mobile, yjsXmlFragment, currentNoteId]);

  const editor = useEditor({
    extensions,
    content: yjsXmlFragment ? undefined : parsedContent, // Yjs 模式不传初始内容
    onUpdate: ({ editor }) => {
      const contentJson = JSON.stringify(editor.getJSON());
      const mdText = proseMirrorJSONToMarkdown(contentJson);

      // 同步模式下更新 Y.Text（mdText 字段）
      if (yjsDoc) {
        const yMdText = yjsDoc.getText("mdText");
        yjsDoc.transact(() => {
          yMdText.delete(0, yMdText.length);
          yMdText.insert(0, mdText);
        });
      }

      onUpdate(contentJson, mdText);
    },
  });

  // ... 其余代码不变
}
```

### 5.2 SyncEngine 扩展

```ts
// packages/web/src/lib/sync-engine.ts

export class SyncEngine {
  private providers = new Map<string, WebsocketProvider>();

  getProvider(noteId: string): WebsocketProvider | null {
    return this.providers.get(noteId) || null;
  }

  getNoteDoc(noteId: string): Y.Doc {
    const existing = this.docs.get(noteId);
    if (existing) return existing;

    const doc = new Y.Doc();
    const docName = `note:${noteId}`;

    const wsUrl = this.config.serverUrl.replace(/^http/, "ws") + "/ws";
    const provider = new WebsocketProvider(wsUrl, docName, doc, {
      params: { token: this.config.token },
    });

    this.providers.set(noteId, provider);
    this.docs.set(noteId, doc);

    return doc;
  }
}
```

### 5.3 TipTap 扩展配置

```ts
// packages/web/src/lib/tiptap-setup.ts

// 新增导入（但不添加到默认扩展列表）
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

export function getEditorExtensions(isMobile: boolean) {
  // 不添加 Collaboration 扩展（由 Editor 按需注入）
  return [
    StarterKit.configure({ ... }),
    // ... 其他扩展
  ];
}
```

## 6. 附件同步

### 6.1 sync-attachment.ts

```ts
// packages/web/src/lib/sync-attachment.ts

const MAX_CONCURRENT_UPLOADS = 3;
const uploadQueue: Array<{ att: Attachment; file: File }> = [];

export async function upload(att: Attachment, file: File): Promise<void> {
  uploadQueue.push({ att, file });
  await processUploadQueue();
}

async function processUploadQueue(): Promise<void> {
  while (uploadQueue.length > 0) {
    const batch = uploadQueue.splice(0, MAX_CONCURRENT_UPLOADS);
    await Promise.all(
      batch.map(({ att, file }) =>
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
}

export async function download(id: string): Promise<Blob | null> {
  try {
    return await client.downloadAttachment(id);
  } catch (err) {
    console.error("Failed to download attachment:", id, err);
    return null;
  }
}
```

### 6.2 useAttachmentUpload 修改

```ts
// packages/web/src/hooks/useAttachmentUpload.ts

import { useSyncStore } from "../stores/syncStore";
import { upload as syncUpload } from "../lib/sync-attachment";

export function useAttachmentUpload(noteId: string) {
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult> => {
      // 现有逻辑：上传到本地 IndexedDB
      const result = await uploadToIndexedDB(noteId, file);

      // 新增：同步启用时推送到服务端
      if (result.success && result.attachment && useSyncStore.getState().engine) {
        syncUpload(result.attachment, file).catch(() => {
          // 静默失败，离线时不阻塞
        });
      }

      return result;
    },
    [noteId],
  );

  return { uploadFile };
}
```

### 6.3 useAttachmentRenderer 修改

```ts
// packages/web/src/hooks/useAttachmentRenderer.ts

import { useSyncStore } from "../stores/syncStore";
import { download as syncDownload } from "../lib/sync-attachment";

export function useAttachmentRenderer(src: string) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src.startsWith("attachment://")) return;

    const id = src.replace("attachment://", "");

    (async () => {
      // 1. 尝试从本地 IndexedDB 读取
      let blob = await getStorage().getAttachmentBlob(id);

      // 2. 本地无且同步启用 → 从服务端下载
      if (!blob && useSyncStore.getState().engine) {
        blob = await syncDownload(id);
        if (blob) {
          // 缓存到本地 IndexedDB（通过现有 storage adapter）
          await getStorage().saveAttachmentBlob(id, blob);
        }
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        return () => URL.revokeObjectURL(url);
      }
    })();
  }, [src]);

  return { blobUrl };
}
```

## 7. 离线与重连优化

### 7.1 元数据队列去重

```ts
// pushQueue 按 entityId 去重，只保留最新版本
enqueue(item: QueueItem): void {
  if (item.entityId) {
    const existingIndex = this.queue.findIndex(
      q => q.entityId === item.entityId && q.type === item.type
    );
    if (existingIndex !== -1) {
      this.queue[existingIndex] = item; // 替换旧版本
      return;
    }
  }
  this.queue.push(item);
}
```

### 7.2 附件上传并发控制

```ts
const MAX_CONCURRENT_UPLOADS = 3;

async function processUploadQueue(): Promise<void> {
  while (uploadQueue.length > 0) {
    const batch = uploadQueue.splice(0, MAX_CONCURRENT_UPLOADS);
    await Promise.all(batch.map(...));
  }
}
```

### 7.3 Yjs 协议自带优化

- 重连时发送 **state vector**（几十字节，描述"我有什么"）
- 服务端返回 **缺失的 updates diff**（不是全量）
- `y-websocket` 库内部已处理此优化，无需额外代码

## 8. StorageAdapter 扩展

### 8.1 新增方法

附件按需下载需要直接写入 blob 到 IndexedDB（不经过完整的 saveAttachment 流程）。在 `StorageAdapter` 接口中新增：

```ts
// packages/core/src/storage/adapter.ts

interface StorageAdapter {
  // ... 现有方法

  // 新增：直接保存 blob 到 IndexedDB（用于从服务端下载后缓存）
  saveAttachmentBlob(id: string, blob: Blob): Promise<void>;
}
```

`WebStorageAdapter` 实现：

```ts
async saveAttachmentBlob(id: string, blob: Blob): Promise<void> {
  await saveBlob(id, blob);
}
```

## 9. 实施阶段

| 子阶段    | 范围                                                    | 交付物                                                |
| --------- | ------------------------------------------------------- | ----------------------------------------------------- |
| **P6.6**  | sync-client.ts + sync-metadata.ts + StorageAdapter 扩展 | REST API 客户端 + 元数据同步逻辑 + saveAttachmentBlob |
| **P6.7**  | useStorage 拦截层集成                                   | 所有 CRUD 操作自动推送元数据                          |
| **P6.8**  | y-prosemirror 集成                                      | TipTap 编辑器接入 Yjs，实时协作编辑                   |
| **P6.9**  | 附件同步（上传 + 按需下载）                             | 附件跨设备同步                                        |
| **P6.10** | 全局验证 + 离线测试                                     | 多设备同步验证                                        |

### 依赖关系

```
P6.6 → P6.7 → P6.8
          ↘ P6.9
                ↘ P6.10
```

### 验证标准

- **P6.6**：登录成功后自动拉取远程元数据并合并到本地
- **P6.7**：设备 A 创建笔记 → 设备 B 刷新后可见
- **P6.8**：两个浏览器同时编辑同一笔记，内容实时同步
- **P6.9**：设备 A 上传图片 → 设备 B 打开笔记时自动下载并显示
- **P6.10**：离线编辑 → 重连后自动同步，无数据丢失

## 关键依赖

```json
{
  "packages/web": {
    "dependencies": {
      "@tiptap/extension-collaboration": "^2",
      "@tiptap/extension-collaboration-cursor": "^2"
    }
  }
}
```
