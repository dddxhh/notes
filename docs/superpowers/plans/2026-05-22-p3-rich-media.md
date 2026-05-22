# 笔记应用富媒体扩展 实施计划 (P3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 TipTap 编辑器添加图片/视频自定义节点、斜杠命令面板、附件上传流程，实现富媒体笔记的创建、编辑和持久化。

**Architecture:** TipTap 自定义 Image/Video Node 扩展，通过 `attachment://id` 协议引用 IndexedDB 中的二进制文件。拖拽/粘贴/选择文件触发上传流程：文件校验 → IndexedDB 存储 → SQLite 元数据 → 编辑器插入节点。斜杠命令使用 TipTap Suggestion 扩展实现 Notion 风格命令面板。

**Tech Stack:** TipTap v2 自定义扩展, @tiptap/suggestion, tippy.js (命令面板浮层), @tiptap/extension-image (参考改造), prosemirror-model (自定义 Node), React 18, Zustand

**设计规格:** `docs/superpowers/specs/2026-05-21-notes-app-design.md`

**前置条件:** P0+P1+P2 已完成（StorageAdapter 含附件 CRUD、TipTap 编辑器可用）

---

## 文件结构

```
packages/core/src/
├── models/                          # (已有)
├── storage/                         # (已有，含 saveAttachment 等)
├── search/                          # (已有)
├── utils/
│   ├── file-validation.ts           # 文件校验（大小、MIME 类型）
│   ├── image-compress.ts            # 图片压缩（Canvas 缩放）
│   ├── uuid.ts                      # (已有)
│   ├── timestamp.ts                 # (已有)
│   └── index.ts                     # (更新导出)
└── index.ts                         # (更新导出)

packages/web/src/
├── components/
│   ├── shared/
│   │   ├── Editor.tsx               # (更新：注册 Image/Video/SlashCommand 扩展)
│   │   ├── EditorToolbar.tsx        # (更新：添加图片/视频按钮)
│   │   ├── MarkdownEditor.tsx       # (已有)
│   │   ├── NoteCard.tsx             # (更新：显示缩略图)
│   │   ├── TagBadge.tsx             # (已有)
│   │   ├── ModeToggle.tsx           # (已有)
│   │   ├── AttachmentRenderer.tsx   # 新增：渲染 attachment:// 协议的图片
│   │   ├── VideoRenderer.tsx        # 新增：渲染 attachment:// 协议的视频
│   │   ├── SlashCommandPanel.tsx    # 新增：斜杠命令面板 UI
│   │   ├── ImageUploadButton.tsx    # 新增：图片上传触发器（桌面端 toolbar + 移动端 FAB）
│   │   ├── VideoUploadButton.tsx    # 新增：视频上传触发器
│   │   └── Toast.tsx                # 新增：轻量通知组件（上传错误/成功提示）
│   ├── desktop/
│   │   └── Sidebar.tsx              # (已有)
│   ├── mobile/
│   │   └── NoteListMobile.tsx       # (已有)
│   ├── layouts/
│   │   ├── DesktopLayout.tsx        # (已有)
│   │   └── MobileLayout.tsx         # (更新：移动端 FAB 上传按钮)
│   ├── QuickNote.tsx                # (已有)
│   └── NoteView.tsx                 # (更新：拖拽/粘贴上传 + Object URL 清理)
├── hooks/
│   ├── useResponsive.ts             # (已有)
│   ├── useStorage.ts                # (已有，已有 saveAttachment)
│   ├── useAutoSave.ts               # (已有)
│   ├── useAttachmentUpload.ts       # 新增：附件上传流程 Hook
│   ├── useAttachmentRenderer.ts     # 新增：attachment:// 协议解析 Hook
│   └── index.ts                     # (更新导出)
├── stores/
│   ├── notesStore.ts                # (已有)
│   ├── attachmentsStore.ts          # 新增：附件 Zustand store
│   ├── foldersStore.ts              # (已有)
│   ├── uiStore.ts                   # (已有)
│   ├── slashCommandStore.ts         # 新增：斜杠命令上传意图 state（替代 CustomEvent）
│   └── index.ts                     # (更新导出)
├── lib/
│   ├── tiptap-setup.ts              # (更新：注册 Image/Video/SlashCommand 扩展)
│   ├── markdown-serializer.ts       # (更新：支持 Image/Video 节点的 MD 序列化)
│   ├── attachment-protocol.ts       # 新增：attachment:// URL 生成和解析
│   ├── CustomImage.ts               # 新增：TipTap 自定义 Image Node 扩展
│   ├── CustomVideo.ts               # 新增：TipTap 自定义 Video Node 扩展
│   ├── SlashCommand.ts              # 新增：TipTap 斜杠命令 Suggestion 扩展
│   ├── sqlite-init.ts               # (已有)
│   └── index.ts                     # (更新导出)
├── styles/
│   ├── globals.css                  # (更新：图片/视频/命令面板样式)
│   └── index.css                    # (已有)
└── App.tsx                          # (已有)

packages/web/tests/
├── shared/
│   ├── AttachmentRenderer.test.tsx   # 新增
│   ├── VideoRenderer.test.tsx       # 新增
│   ├── SlashCommandPanel.test.tsx    # 新增
│   ├── Toast.test.tsx               # 新增
│   ├── Editor.test.tsx              # (更新：图片/视频节点测试)
│   ├── EditorToolbar.test.tsx       # (更新：新增按钮测试)
│   └── NoteView.test.tsx            # (更新：拖拽/粘贴上传测试)
├── hooks/
│   ├── useAttachmentUpload.test.ts   # 新增
│   ├── useAttachmentRenderer.test.ts # 新增
├── lib/
│   ├── CustomImage.test.ts          # 新增
│   ├── CustomVideo.test.ts          # 新增
│   ├── SlashCommand.test.ts         # 新增
│   ├── attachment-protocol.test.ts   # 新增
│   └── markdown-serializer.test.ts  # (更新)
└── NoteCard.test.tsx                # (更新：缩略图测试)

packages/core/tests/
├── utils/
│   ├── file-validation.test.ts      # 新增
│   ├── image-compress.test.ts       # 新增
│   └── uuid.test.ts                 # (已有)
```

---

## Task 20: 文件校验与图片压缩工具

**Files:**
- Create: `packages/core/src/utils/file-validation.ts`
- Create: `packages/core/src/utils/image-compress.ts`
- Modify: `packages/core/src/utils/index.ts`
- Create: `packages/core/tests/utils/file-validation.test.ts`
- Create: `packages/core/tests/utils/image-compress.test.ts`

附件上传需要一个前端校验层。设计规格要求：最大 50MB，限定 MIME 类型，图片 > 5MB 时压缩。

- [ ] **Step 1: 编写 file-validation.ts**

```typescript
// packages/core/src/utils/file-validation.ts
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const IMAGE_COMPRESS_THRESHOLD = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIME_TYPES: Record<AttachmentType, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  video: ["video/mp4", "video/webm", "video/ogg"],
  audio: ["audio/mp3", "audio/ogg", "audio/wav", "audio/webm"],
  file: [], // 任意类型
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  type: AttachmentType | null;
  needsCompress: boolean;
}

export function validateFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "文件大小超过 50MB 限制", type: null, needsCompress: false };
  }

  const detectedType = detectAttachmentType(file.type);
  if (!detectedType) {
    return { valid: false, error: `不支持的文件类型: ${file.type}`, type: null, needsCompress: false };
  }

  const allowed = ALLOWED_MIME_TYPES[detectedType];
  if (detectedType !== "file" && allowed.length > 0 && !allowed.includes(file.type)) {
    return { valid: false, error: `不允许的 MIME 类型: ${file.type}`, type: null, needsCompress: false };
  }

  const needsCompress = detectedType === "image" && file.size > IMAGE_COMPRESS_THRESHOLD;
  return { valid: true, type: detectedType, needsCompress };
}

export function detectAttachmentType(mimeType: string): AttachmentType | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}
```

- [ ] **Step 2: 编写 image-compress.ts**

```typescript
// packages/core/src/utils/image-compress.ts
const MAX_COMPRESS_WIDTH = 1920;
const MAX_COMPRESS_HEIGHT = 1080;
const COMPRESS_QUALITY = 0.8;

export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > MAX_COMPRESS_WIDTH) {
    height = Math.round(height * (MAX_COMPRESS_WIDTH / width));
    width = MAX_COMPRESS_WIDTH;
  }
  if (height > MAX_COMPRESS_HEIGHT) {
    width = Math.round(width * (MAX_COMPRESS_HEIGHT / height));
    height = MAX_COMPRESS_HEIGHT;
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await canvas.convertToBlob({ type: "image/webp", quality: COMPRESS_QUALITY });
  bitmap.close();

  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
}

export function shouldCompressImage(file: File): boolean {
  return file.type.startsWith("image/") && file.size > 5 * 1024 * 1024;
}
```

- [ ] **Step 3: 更新 utils/index.ts 导出**

在 `packages/core/src/utils/index.ts` 中添加：
```typescript
export { validateFile, detectAttachmentType } from "./file-validation";
export { compressImage, shouldCompressImage } from "./image-compress";
```

同时更新 `packages/core/src/index.ts` 导出这些工具。

- [ ] **Step 4: 编写 file-validation.test.ts**

测试文件大小限制、MIME 类型检测、图片/视频/音频类型判定、needsCompress 标记。

- [ ] **Step 5: 编写 image-compress.test.ts**

测试图片压缩流程（使用 fake-indexeddb 环境 + OffscreenCanvas mock）、大图缩放、小图不压缩。

- [ ] **Step 6: 运行 core 单元测试**

```bash
pnpm --filter @notes/core test
```

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/utils/file-validation.ts packages/core/src/utils/image-compress.ts packages/core/src/utils/index.ts packages/core/src/index.ts packages/core/tests/utils/file-validation.test.ts packages/core/tests/utils/image-compress.test.ts
git commit -m "feat: add file validation and image compression utilities"
```

---

## Task 21: attachment:// 协议定义、解析与渲染 Hook

**Files:**
- Create: `packages/web/src/lib/attachment-protocol.ts`
- Create: `packages/web/src/hooks/useAttachmentRenderer.ts`
- Modify: `packages/web/src/hooks/index.ts`
- Create: `packages/web/tests/lib/attachment-protocol.test.ts`
- Create: `packages/web/tests/hooks/useAttachmentRenderer.test.ts`

编辑器中的图片/视频节点使用 `attachment://<id>` 作为 src，渲染时需要将其解析为实际的 Object URL（从 IndexedDB 加载 Blob）。`useAttachmentRenderer` Hook 供 AttachmentRenderer/VideoRenderer/NoteCard 组件调用，统一处理 Object URL 的创建与缓存。

- [ ] **Step 1: 编写 attachment-protocol.ts**

```typescript
// packages/web/src/lib/attachment-protocol.ts

export const ATTACHMENT_PROTOCOL = "attachment://";

export function createAttachmentSrc(attachmentId: string): string {
  return `${ATTACHMENT_PROTOCOL}${attachmentId}`;
}

export function isAttachmentSrc(src: string): boolean {
  return src.startsWith(ATTACHMENT_PROTOCOL);
}

export function parseAttachmentId(src: string): string | null {
  if (!isAttachmentSrc(src)) return null;
  return src.slice(ATTACHMENT_PROTOCOL.length);
}

const objectUrlCache = new Map<string, string>();

export async function resolveAttachmentSrc(
  src: string,
  getBlob: (id: string) => Promise<Blob | null>
): Promise<string | null> {
  const id = parseAttachmentId(src);
  if (!id) return src; // 非 attachment 协议，原样返回

  if (objectUrlCache.has(id)) return objectUrlCache.get(id)!;

  const blob = await getBlob(id);
  if (!blob) return null; // 附件丢失

  const objectUrl = URL.createObjectURL(blob);
  objectUrlCache.set(id, objectUrl);
  return objectUrl;
}

export function revokeAttachmentObjectUrl(attachmentId: string): void {
  const url = objectUrlCache.get(attachmentId);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(attachmentId);
  }
}

export function revokeAllObjectUrls(): void {
  for (const [id, url] of objectUrlCache) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();
}
```

- [ ] **Step 2: 编写 useAttachmentRenderer.ts**

```typescript
// packages/web/src/hooks/useAttachmentRenderer.ts
import { useState, useEffect, useCallback } from "react";
import { resolveAttachmentSrc, revokeAttachmentObjectUrl, parseAttachmentId } from "../lib/attachment-protocol";
import { getStorage } from "../lib/sqlite-init";

export function useAttachmentRenderer(src: string) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;

    resolveAttachmentSrc(src, async (id) => {
      const storage = getStorage();
      return storage.getAttachmentBlob(id);
    }).then((url) => {
      if (cancelled) return;
      if (url) setResolvedSrc(url);
      else setError(true);
    });

    return () => { cancelled = true; };
  }, [src]);

  const cleanup = useCallback(() => {
    const id = parseAttachmentId(src);
    if (id) revokeAttachmentObjectUrl(id);
  }, [src]);

  return { resolvedSrc, error, cleanup };
}

export function useThumbnailRenderer(attachmentId: string) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!attachmentId) return;
    let cancelled = false;

    const loadThumbnail = async () => {
      try {
        const storage = getStorage();
        const blob = await storage.getAttachmentThumbnail(attachmentId);
        if (cancelled) return;
        if (blob) {
          const url = URL.createObjectURL(blob);
          setThumbnailUrl(url);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    loadThumbnail();

    return () => {
      cancelled = true;
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    };
  }, [attachmentId]);

  return { thumbnailUrl, error };
}
```

> **说明：** `useThumbnailRenderer` 专门用于 NoteCard 等列表场景，调用 `getAttachmentThumbnail`（缩略图，约 200px 宽度）而非完整 Blob，减少内存占用和加载时间。

- [ ] **Step 3: 编写 attachment-protocol.test.ts**

测试 `createAttachmentSrc`、`isAttachmentSrc`、`parseAttachmentId`、`resolveAttachmentSrc`（mock getBlob）、Object URL 缓存和清理。

- [ ] **Step 4: 编写 useAttachmentRenderer.test.ts**

测试：attachment:// src 解析为 Object URL、附件丢失时返回 error、cleanup 释放 Object URL、thumbnail 渲染与失败处理。

- [ ] **Step 5: 更新 hooks/index.ts**

添加 `export { useAttachmentRenderer, useThumbnailRenderer } from "./useAttachmentRenderer";`

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/lib/attachment-protocol.ts packages/web/src/hooks/useAttachmentRenderer.ts packages/web/src/hooks/index.ts packages/web/tests/lib/attachment-protocol.test.ts packages/web/tests/hooks/useAttachmentRenderer.test.ts
git commit -m "feat: add attachment:// protocol and useAttachmentRenderer/useThumbnailRenderer hooks"
```

---

## Task 22: 附件 Zustand Store

**Files:**
- Create: `packages/web/src/stores/attachmentsStore.ts`
- Modify: `packages/web/src/stores/index.ts`

需要一个 store 来管理当前笔记的附件列表，供渲染和删除使用。

- [ ] **Step 1: 编写 attachmentsStore.ts**

```typescript
// packages/web/src/stores/attachmentsStore.ts
import { create } from "zustand";
import type { Attachment } from "@notes/core";

interface AttachmentsState {
  attachments: Attachment[];
  loading: boolean;
  setAttachments: (attachments: Attachment[]) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAttachmentsStore = create<AttachmentsState>((set) => ({
  attachments: [],
  loading: false,
  setAttachments: (attachments) => set({ attachments }),
  addAttachment: (attachment) =>
    set((state) => ({ attachments: [...state.attachments, attachment] })),
  removeAttachment: (id) =>
    set((state) => ({ attachments: state.attachments.filter((a) => a.id !== id) })),
  setLoading: (loading) => set({ loading }),
}));
```

- [ ] **Step 2: 更新 stores/index.ts**

添加 `export { useAttachmentsStore } from "./attachmentsStore";`

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/stores/attachmentsStore.ts packages/web/src/stores/index.ts
git commit -m "feat: add attachments Zustand store"
```

---

## Task 23: 附件上传 Hook

**Files:**
- Create: `packages/web/src/hooks/useAttachmentUpload.ts`
- Modify: `packages/web/src/hooks/index.ts`
- Create: `packages/web/tests/hooks/useAttachmentUpload.test.ts`

整合文件校验 → 图片压缩 → StorageAdapter 存储 → **缩略图生成** → store 更新的完整上传流程。设计规格要求：图片附件需生成 200px 宽度缩略图存入 IndexedDB thumbnails-store，供列表/网格视图使用。

- [ ] **Step 1: 编写 useAttachmentUpload.ts**

```typescript
// packages/web/src/hooks/useAttachmentUpload.ts
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
          // 压缩失败，使用原始文件
        }
      }

      try {
        const storage = getStorage();
        const attachment = await storage.saveAttachment(
          noteId,
          processedFile,
          validation.type!
        );

        // 图片附件：生成缩略图存入 IndexedDB thumbnails-store
        // saveAttachment 内部已调用 IndexedDB generateImageThumbnail
        // 此处无需额外操作，WebStorageAdapter.saveAttachment 自动处理缩略图生成

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
```

> **关键说明：** `WebStorageAdapter.saveAttachment` 在 P1 实现中已自动调用 `generateImageThumbnail(blob)` 将缩略图存入 IndexedDB `thumbnails-store`。P3 上传 Hook 无需手动调用缩略图生成，只需确保 `saveAttachment` 的缩略图逻辑完整。需在 Step 2 中验证此流程。

- [ ] **Step 2: 验证 saveAttachment 缩略图生成流程**

检查 `packages/core/src/storage/web-adapter.ts` 中 `saveAttachment` 方法是否已包含：
1. 调用 `indexeddb.generateImageThumbnail(blob)` 生成 200px 缩略图
2. 将缩略图存入 IndexedDB `thumbnails-store`
3. 视频附件不生成缩略图（返回 null）

如果缺失，需要补充此逻辑。

- [ ] **Step 3: 更新 hooks/index.ts**

添加 `export { useAttachmentUpload } from "./useAttachmentUpload";` 和类型导出。

- [ ] **Step 4: 编写 useAttachmentUpload.test.ts**

测试文件校验失败、图片压缩后上传、视频直接上传、store 更新、**缩略图是否随附件自动生成**。

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useAttachmentUpload.ts packages/web/src/hooks/index.ts packages/web/tests/hooks/useAttachmentUpload.test.ts
git commit -m "feat: add useAttachmentUpload hook with validation and compression"
```

---

## Task 24: TipTap 自定义 Image Node 扩展

**Files:**
- Create: `packages/web/src/lib/CustomImage.ts`
- Create: `packages/web/tests/lib/CustomImage.test.ts`

自定义 Image Node 使用 `attachment://id` 作为 src 属性。渲染时由 `AttachmentRenderer` 组件解析为 Object URL。支持拖拽/粘贴上传。

- [ ] **Step 1: 编写 CustomImage.ts**

```typescript
// packages/web/src/lib/CustomImage.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import AttachmentRenderer from "../components/shared/AttachmentRenderer";

export interface CustomImageOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}

export const CustomImage = Node.create<CustomImageOptions>({
  name: "customImage",

  group: "block",

  inline: false,

  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentRenderer);
  },

  addCommands() {
    return {
      setCustomImage:
        (options) =>
        (commands) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
```

- [ ] **Step 2: 编写 AttachmentRenderer.tsx**

```typescript
// packages/web/src/components/shared/AttachmentRenderer.tsx
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { useEffect, useState } from "react";
import { isAttachmentSrc, resolveAttachmentSrc, parseAttachmentId } from "../../lib/attachment-protocol";
import { getStorage } from "../../lib/sqlite-init";

interface AttachmentRendererProps {
  node: { attrs: { src: string; alt?: string; title?: string } };
}

export default function AttachmentRenderer({ node }: AttachmentRendererProps) {
  const { src, alt, title } = node.attrs;
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    resolveAttachmentSrc(src, async (id) => {
      const storage = getStorage();
      return storage.getAttachmentBlob(id);
    }).then((url) => {
      if (url) setResolvedSrc(url);
      else setError(true);
    });
  }, [src]);

  if (error) {
    return (
      <NodeViewWrapper>
        <div className="attachment-error">附件丢失</div>
      </NodeViewWrapper>
    );
  }

  if (!resolvedSrc) {
    return (
      <NodeViewWrapper>
        <div className="attachment-loading">加载中...</div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <img
        src={resolvedSrc}
        alt={alt || ""}
        title={title || ""}
        className="custom-image"
        loading="lazy"
      />
    </NodeViewWrapper>
  );
}
```

- [ ] **Step 3: 编写 CustomImage.test.ts**

测试节点定义、属性、命令 `setCustomImage`、attachment:// src 解析。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/CustomImage.ts packages/web/src/components/shared/AttachmentRenderer.tsx packages/web/tests/lib/CustomImage.test.ts
git commit -m "feat: add CustomImage TipTap node with attachment:// protocol rendering"
```

---

## Task 25: TipTap 自定义 Video Node 扩展

**Files:**
- Create: `packages/web/src/lib/CustomVideo.ts`
- Create: `packages/web/tests/lib/CustomVideo.test.ts`

视频节点与图片类似，使用 `<video>` 标签渲染，支持 attachment:// 协议。

- [ ] **Step 1: 编写 CustomVideo.ts**

```typescript
// packages/web/src/lib/CustomVideo.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import VideoRenderer from "../components/shared/VideoRenderer";

export interface CustomVideoOptions {
  HTMLAttributes: Record<string, string>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customVideo: {
      setCustomVideo: (options: { src: string; title?: string }) => ReturnType;
    };
  }
}

export const CustomVideo = Node.create<CustomVideoOptions>({
  name: "customVideo",

  group: "block",

  inline: false,

  draggable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      src: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes(this.options.HTMLAttributes, { controls: "true" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoRenderer);
  },

  addCommands() {
    return {
      setCustomVideo:
        (options) =>
        (commands) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
```

- [ ] **Step 2: 编写 VideoRenderer.tsx**

```typescript
// packages/web/src/components/shared/VideoRenderer.tsx
import { NodeViewWrapper } from "@tiptap/react";
import { useEffect, useState } from "react";
import { resolveAttachmentSrc } from "../../lib/attachment-protocol";
import { getStorage } from "../../lib/sqlite-init";

interface VideoRendererProps {
  node: { attrs: { src: string; title?: string } };
}

export default function VideoRenderer({ node }: VideoRendererProps) {
  const { src, title } = node.attrs;
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    resolveAttachmentSrc(src, async (id) => {
      const storage = getStorage();
      return storage.getAttachmentBlob(id);
    }).then((url) => {
      if (url) setResolvedSrc(url);
      else setError(true);
    });
  }, [src]);

  if (error) {
    return (
      <NodeViewWrapper>
        <div className="attachment-error">视频附件丢失</div>
      </NodeViewWrapper>
    );
  }

  if (!resolvedSrc) {
    return (
      <NodeViewWrapper>
        <div className="attachment-loading">视频加载中...</div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <video
        src={resolvedSrc}
        controls
        preload="metadata"
        className="custom-video"
        title={title || ""}
      />
    </NodeViewWrapper>
  );
}
```

- [ ] **Step 3: 编写 CustomVideo.test.ts**

测试节点定义、命令 `setCustomVideo`、video 标签渲染。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/CustomVideo.ts packages/web/src/components/shared/VideoRenderer.tsx packages/web/tests/lib/CustomVideo.test.ts
git commit -m "feat: add CustomVideo TipTap node with attachment:// protocol rendering"
```

---

## Task 26: 斜杠命令扩展

**Files:**
- Create: `packages/web/src/lib/SlashCommand.ts`
- Create: `packages/web/src/components/shared/SlashCommandPanel.tsx`
- Create: `packages/web/tests/lib/SlashCommand.test.ts`
- Create: `packages/web/tests/shared/SlashCommandPanel.test.tsx`

斜杠命令是 Notion 风格的交互：输入 `/` 弹出命令面板，选择命令后执行对应操作（插入图片、视频、代码块、标题等）。图片/视频上传意图通过 Zustand `slashCommandStore` 传递，避免使用 DOM CustomEvent 这种不够 React-friendly 的方式。

- [ ] **Step 0: 编写 slashCommandStore.ts**

```typescript
// packages/web/src/stores/slashCommandStore.ts
import { create } from "zustand";

interface SlashCommandState {
  pendingUpload: "image" | "video" | null;
  setPendingUpload: (type: "image" | "video" | null) => void;
}

export const useSlashCommandStore = create<SlashCommandState>((set) => ({
  pendingUpload: null,
  setPendingUpload: (type) => set({ pendingUpload: type }),
}));
```

在 `packages/web/src/stores/index.ts` 中添加导出。

- [ ] **Step 1: 安装 @tiptap/suggestion 和 tippy.js**

在 `packages/web/package.json` 的 dependencies 中添加：
```
"@tiptap/suggestion": "^2",
"tippy.js": "^6"
```

Run: `pnpm install`

- [ ] **Step 2: 编写 SlashCommand.ts**

```typescript
// packages/web/src/lib/SlashCommand.ts
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { useSlashCommandStore } from "../stores/slashCommandStore";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: any; range: any }) => void;
}

export const SlashCommandItems: SlashCommandItem[] = [
  {
    title: "标题 1",
    description: "大标题",
    icon: "H1",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "标题 2",
    description: "中标题",
    icon: "H2",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "标题 3",
    description: "小标题",
    icon: "H3",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "无序列表",
    description: "创建无序列表",
    icon: "•",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "有序列表",
    description: "创建有序列表",
    icon: "1.",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "代码块",
    description: "插入代码块",
    icon: "</>",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "引用",
    description: "插入引用块",
    icon: "❝",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "图片",
    description: "上传并插入图片",
    icon: "🖼",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // 通过 Zustand store 触发上传意图（替代 DOM CustomEvent）
      useSlashCommandStore.getState().setPendingUpload("image");
    },
  },
  {
    title: "视频",
    description: "上传并插入视频",
    icon: "🎬",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // 通过 Zustand store 触发上传意图
      useSlashCommandStore.getState().setPendingUpload("video");
    },
  },
  {
    title: "分割线",
    description: "插入水平分割线",
    icon: "—",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        items: ({ query }) => {
          return SlashCommandItems.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: SlashCommandPanel | null = null;
          let popup: TippyInstance | null = null;

          return {
            onStart: (props) => {
              component = new SlashCommandPanel(props);
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate(props) {
              component?.updateProps(props);
              popup?.setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup?.hide();
                return true;
              }
              return component?.onKeyDown(props) ?? false;
            },
            onExit() {
              popup?.destroy();
              component?.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
```

- [ ] **Step 3: 编写 SlashCommandPanel.tsx**

一个纯 JS/DOM 组件（非 React），因为 TipTap Suggestion 需要直接操作 DOM：

```typescript
// packages/web/src/components/shared/SlashCommandPanel.tsx
import type { SlashCommandItem } from "../../lib/SlashCommand";

export class SlashCommandPanel {
  element: HTMLElement;
  items: SlashCommandItem[];
  selectedIndex: number;
  onClick: (item: SlashCommandItem) => void;

  constructor(props: { items: SlashCommandItem[]; command: (item: SlashCommandItem) => void }) {
    this.items = props.items;
    this.selectedIndex = 0;
    this.onClick = props.command;
    this.element = document.createElement("div");
    this.element.classList.add("slash-command-panel");
    this.render();
  }

  updateProps(props: { items: SlashCommandItem[] }) {
    this.items = props.items;
    this.selectedIndex = 0;
    this.render();
  }

  onKeyDown({ event }: { event: KeyboardEvent }): boolean {
    if (event.key === "ArrowUp") {
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
      this.render();
      return true;
    }
    if (event.key === "ArrowDown") {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.render();
      return true;
    }
    if (event.key === "Enter") {
      this.onClick(this.items[this.selectedIndex]);
      return true;
    }
    return false;
  }

  render() {
    this.element.innerHTML = "";
    this.items.forEach((item, index) => {
      const div = document.createElement("div");
      div.classList.add("slash-command-item");
      if (index === this.selectedIndex) div.classList.add("selected");
      div.innerHTML = `<span class="icon">${item.icon}</span> <span class="title">${item.title}</span> <span class="description">${item.description}</span>`;
      div.addEventListener("click", () => this.onClick(item));
      this.element.appendChild(div);
    });
  }

  destroy() {
    this.element.remove();
  }
}
```

- [ ] **Step 4: 编写 SlashCommand.test.ts**

测试 SlashCommand 扩展注册、命令过滤（query）、键盘导航。

- [ ] **Step 5: 编写 SlashCommandPanel.test.tsx**

测试面板渲染、上下键选择、Enter 键执行命令、点击执行命令。

- [ ] **Step 6: Commit**

```bash
git add packages/web/package.json packages/web/src/lib/SlashCommand.ts packages/web/src/components/shared/SlashCommandPanel.tsx packages/web/tests/lib/SlashCommand.test.ts packages/web/tests/shared/SlashCommandPanel.test.tsx pnpm-lock.yaml
git commit -m "feat: add slash command extension with suggestion panel"
```

---

## Task 27: 上传触发 UI（图片/视频按钮）

**Files:**
- Create: `packages/web/src/components/shared/ImageUploadButton.tsx`
- Create: `packages/web/src/components/shared/VideoUploadButton.tsx`
- Create: `packages/web/tests/shared/ImageUploadButton.test.tsx`
- Create: `packages/web/tests/shared/VideoUploadButton.test.tsx`

桌面端在 EditorToolbar 中添加上传按钮，移动端使用 FAB 或斜杠命令触发。

- [ ] **Step 1: 编写 ImageUploadButton.tsx**

```typescript
// packages/web/src/components/shared/ImageUploadButton.tsx
import { useRef } from "react";

interface ImageUploadButtonProps {
  onFileSelected: (file: File) => void;
  className?: string;
}

export default function ImageUploadButton({ onFileSelected, className }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };

  return (
    <>
      <button onClick={handleClick} className={className || "toolbar-btn"} title="插入图片">
        🖼
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </>
  );
}
```

- [ ] **Step 2: 编写 VideoUploadButton.tsx**

```typescript
// packages/web/src/components/shared/VideoUploadButton.tsx
import { useRef } from "react";

interface VideoUploadButtonProps {
  onFileSelected: (file: File) => void;
  className?: string;
}

export default function VideoUploadButton({ onFileSelected, className }: VideoUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };

  return (
    <>
      <button onClick={handleClick} className={className || "toolbar-btn"} title="插入视频">
        🎬
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </>
  );
}
```

- [ ] **Step 3: 编写 ImageUploadButton.test.tsx**

测试按钮渲染、点击触发 input、文件选择调用 onFileSelected。

- [ ] **Step 4: 编写 VideoUploadButton.test.tsx**

同上，但 accept 属性为 `video/*`。

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/shared/ImageUploadButton.tsx packages/web/src/components/shared/VideoUploadButton.tsx packages/web/tests/shared/ImageUploadButton.test.tsx packages/web/tests/shared/VideoUploadButton.test.tsx
git commit -m "feat: add image and video upload button components"
```

---

## Task 28: 更新 Editor 和 EditorToolbar 注册新扩展

**Files:**
- Modify: `packages/web/src/lib/tiptap-setup.ts`
- Modify: `packages/web/src/components/shared/Editor.tsx`
- Modify: `packages/web/src/components/shared/EditorToolbar.tsx`
- Modify: `packages/web/src/lib/index.ts`

将 CustomImage、CustomVideo、SlashCommand 注册到编辑器扩展中，并在 toolbar 添加上传按钮。

- [ ] **Step 1: 更新 tiptap-setup.ts**

在 `getEditorExtensions` 中添加 CustomImage、CustomVideo、SlashCommand：

```typescript
// packages/web/src/lib/tiptap-setup.ts
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import { CustomImage } from "./CustomImage";
import { CustomVideo } from "./CustomVideo";
import { SlashCommand } from "./SlashCommand";

export function getEditorExtensions(isMobile: boolean) {
  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
    }),
    Placeholder.configure({
      placeholder: isMobile ? "开始记录..." : "想写点什么？",
    }),
    CharacterCount,
    CustomImage,
    CustomVideo,
    SlashCommand,
  ];
  return extensions;
}
```

- [ ] **Step 2: 更新 Editor.tsx**

Editor 需要接收 `onFileUpload` 回调，并通过 Zustand store 监听斜杠命令触发图片/视频上传意图（替代 CustomEvent）：

```typescript
// 在 Editor.tsx 中新增：
// 1. Props 增加 onFileUpload?: (file: File) => void
// 2. 使用 useSlashCommandStore 监听 pendingUpload 状态变化
// 3. 当 pendingUpload 变为 "image" 或 "video" 时，打开对应的文件选择器
// 4. 文件选择后调用 onFileUpload(file)
// 5. 处理完成后调用 setPendingUpload(null) 清除状态
```

具体逻辑：
- `useEffect` 监听 `useSlashCommandStore.pendingUpload`，当值从 null 变为 "image"/"video" 时
- 打开对应的 `<input type="file" accept="image/*">` 或 `<input type="file" accept="video/*">`
- 文件选择后调用 `onFileUpload(file)` → `useAttachmentUpload.uploadFile(file)` → 获得 attachment → `editor.commands.setCustomImage({ src: attachmentSrc })`
- 处理完成后 `setPendingUpload(null)` 清除意图状态

- [ ] **Step 3: 更新 EditorToolbar.tsx**

在 toolbar 中添加 ImageUploadButton 和 VideoUploadButton：

```typescript
// 在 EditorToolbar 中添加两个按钮：
// <ImageUploadButton onFileSelected={handleImageUpload} />
// <VideoUploadButton onFileSelected={handleVideoUpload} />
//
// handleImageUpload/handleVideoUpload:
// 1. 调用 useAttachmentUpload(noteId).uploadFile(file)
// 2. 成功后调用 editor.commands.setCustomImage/setCustomVideo
```

- [ ] **Step 4: 更新 lib/index.ts**

添加导出：`CustomImage`, `CustomVideo`, `SlashCommand`, `SlashCommandItems`, `attachment-protocol`。

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/tiptap-setup.ts packages/web/src/components/shared/Editor.tsx packages/web/src/components/shared/EditorToolbar.tsx packages/web/src/lib/index.ts
git commit -m "feat: register CustomImage, CustomVideo, SlashCommand extensions in editor"
```

---

## Task 29: 拖拽/粘贴上传支持 + Object URL 生命周期管理

**Files:**
- Modify: `packages/web/src/components/shared/Editor.tsx`
- Modify: `packages/web/src/components/NoteView.tsx`

编辑器需要支持拖拽文件和粘贴图片直接触发上传流程。同时 NoteView 在切换笔记/组件卸载时需清理 Object URL 缓存，防止内存泄漏。

- [ ] **Step 1: 在 Editor.tsx 中添加拖拽/粘贴处理**

在 `editorProps` 中添加：

```typescript
editorProps: {
  // ...existing attributes...
  handleDrop: (view, event, _slice, moved) => {
    if (!moved && event.dataTransfer?.files?.length) {
      const files = event.dataTransfer.files;
      for (const file of files) {
        onFileUpload?.(file);
      }
      return true; // 阻止默认行为
    }
    return false;
  },
  handlePaste: (view, event) => {
    const files = event.clipboardData?.files;
    if (files?.length) {
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          onFileUpload?.(file);
        }
      }
      return true;
    }
    return false;
  },
},
```

- [ ] **Step 2: 在 NoteView.tsx 中连接上传流程 + Toast 提示 + Object URL 清理**

NoteView 需要使用 `useAttachmentUpload(noteId)` 并将 `uploadFile` 传给 Editor 组件，同时在上传失败时显示 Toast 通知，并在组件卸载时清理 Object URL：

```typescript
// NoteView.tsx 中：
import { useEffect } from "react";
import { revokeAllObjectUrls } from "../lib/attachment-protocol";
import { useToast } from "../hooks/useToast";
import { useAttachmentUpload } from "../hooks/useAttachmentUpload";
import { createAttachmentSrc } from "../lib/attachment-protocol";

const { uploadFile } = useAttachmentUpload(noteId);
const { showToast } = useToast();

const handleFileUpload = async (file: File) => {
  const result = await uploadFile(file);
  if (result.success && result.attachment) {
    const src = createAttachmentSrc(result.attachment.id);
    if (result.attachment.type === "image") {
      editor?.commands.setCustomImage({ src });
    } else if (result.attachment.type === "video") {
      editor?.commands.setCustomVideo({ src });
    }
    showToast("附件上传成功");
  } else if (!result.success) {
    showToast(result.error || "上传失败", "error");
  }
};

// 切换笔记或组件卸载时清理所有 Object URL
useEffect(() => {
  return () => { revokeAllObjectUrls(); };
}, [noteId]);
```

将 `handleFileUpload` 传给 Editor 的 `onFileUpload` prop。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/shared/Editor.tsx packages/web/src/components/NoteView.tsx
git commit -m "feat: add drag-and-drop and paste upload support for images and videos"
```

---

## Task 30: Markdown 序列器更新（支持 Image/Video）

**Files:**
- Modify: `packages/web/src/lib/markdown-serializer.ts`
- Modify: `packages/web/tests/lib/markdown-serializer.test.ts`

Markdown 序列器需要处理 `customImage` 和 `customVideo` 节点的双向转换。

- [ ] **Step 1: 更新 markdownToProseMirrorJSON**

当解析 Markdown 时遇到 `![alt](src)` 图片语法，生成 `customImage` 节点（而非默认 image）：
```typescript
// 在 markdown 解析后处理 JSON，将 type: "image" 替换为 type: "customImage"
// 保留 src、alt、title 属性
```

- [ ] **Step 2: 更新 proseMirrorJSONToMarkdown**

当序列化到 Markdown 时，`customImage` 节点输出 `![alt](src)`，`customVideo` 节点输出 `[video](src)`（非标准 Markdown，使用 HTML `<video>` 标记）：
```typescript
// 在序列化前处理 JSON，将 customImage → image, customVideo → 特殊标记
```

- [ ] **Step 3: 更新 markdown-serializer.test.ts**

添加测试：包含 attachment:// 图片的 Markdown → JSON → Markdown 双向转换、视频节点的 Markdown 表示。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/markdown-serializer.ts packages/web/tests/lib/markdown-serializer.test.ts
git commit -m "feat: update markdown serializer to support Image and Video nodes"
```

---

## Task 31: NoteCard 缩略图显示（使用 getAttachmentThumbnail）

**Files:**
- Modify: `packages/web/src/components/shared/NoteCard.tsx`
- Modify: `packages/web/tests/shared/NoteCard.test.tsx`

NoteCard 在笔记有图片附件时，显示缩略图作为卡片封面。**必须使用 `useThumbnailRenderer`（调用 `getAttachmentThumbnail`）而非 `getAttachmentBlob`**，避免在列表视图加载完整 Blob 导致内存浪费。

- [ ] **Step 1: 更新 NoteCard.tsx**

在 NoteCard 中，当笔记有图片附件时，使用 `useThumbnailRenderer` 加载缩略图并显示：

```typescript
// NoteCard props 增加 attachments?: Attachment[]
// 找到第一个 image 类型附件的 id
// 使用 useThumbnailRenderer(attachmentId) 获取 thumbnailUrl
// 缩略图显示在卡片左侧或顶部（200px 宽度）
// 缩略图加载失败时显示占位符图标
```

- [ ] **Step 2: 更新 NoteCard.test.tsx**

添加测试：有图片附件时显示缩略图（验证调用 getAttachmentThumbnail 而非 getAttachmentBlob）、无附件时不显示缩略图区域、附件丢失时显示占位符、Object URL 在缩略图组件卸载时释放。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/shared/NoteCard.tsx packages/web/tests/shared/NoteCard.test.ts
git commit -m "feat: show image thumbnails in NoteCard for notes with attachments"
```

---

## Task 31b: Toast 通知组件与 useToast Hook

**Files:**
- Create: `packages/web/src/components/shared/Toast.tsx`
- Create: `packages/web/src/hooks/useToast.ts`
- Modify: `packages/web/src/hooks/index.ts`
- Create: `packages/web/tests/shared/Toast.test.tsx`

轻量 Toast 通知组件，用于上传成功/失败提示。设计规格要求在附件上传失败时向用户反馈，而非静默失败。

- [ ] **Step 1: 编写 useToast.ts**

```typescript
// packages/web/src/hooks/useToast.ts
import { create } from "zustand";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = "info") =>
    set((state) => ({
      toasts: [...state.toasts, { id: Date.now().toString(), message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  const removeToast = useToastStore((s) => s.removeToast);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    addToast(message, type);
    setTimeout(() => {
      removeToast(Date.now().toString());
    }, 3000);
  };

  return { showToast };
}
```

- [ ] **Step 2: 编写 Toast.tsx**

```typescript
// packages/web/src/components/shared/Toast.tsx
import { useToastStore } from "../../hooks/useToast";

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 在 App.tsx 中添加 ToastContainer**

在 App.tsx 渲染树底部添加 `<ToastContainer />`，确保 Toast 在全局可见。

- [ ] **Step 4: 更新 hooks/index.ts**

添加 `export { useToast } from "./useToast";`

- [ ] **Step 5: 编写 Toast.test.tsx**

测试：Toast 渲染、showToast 添加通知、点击关闭、自动消失（3s）、success/error/info 类型样式。

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/hooks/useToast.ts packages/web/src/components/shared/Toast.tsx packages/web/src/hooks/index.ts packages/web/src/App.tsx packages/web/tests/shared/Toast.test.tsx
git commit -m "feat: add Toast notification component and useToast hook for upload feedback"
```

---

## Task 32: 附件相关样式

**Files:**
- Modify: `packages/web/src/styles/globals.css`

添加图片/视频节点、斜杠命令面板、上传按钮、附件错误/加载状态的样式。

- [ ] **Step 1: 添加样式到 globals.css**

```css
/* 自定义图片节点 */
.ProseMirror img.custom-image {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
}

.ProseMirror img.custom-image.ProseMirror-selectednode {
  outline: 2px solid #3b82f6;
}

/* 自定义视频节点 */
.ProseMirror video.custom-video {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
}

/* 附件状态 */
.attachment-loading,
.attachment-error {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 0.5rem;
  padding: 1rem;
  color: #64748b;
  min-height: 100px;
  min-width: 200px;
}

.attachment-error {
  color: #ef4444;
}

/* 斜杠命令面板 */
.slash-command-panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.slash-command-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-radius: 0.25rem;
}

.slash-command-item.selected,
.slash-command-item:hover {
  background: #f1f5f9;
}

.slash-command-item .icon {
  font-weight: 700;
  width: 1.5rem;
  text-align: center;
}

.slash-command-item .title {
  font-weight: 600;
}

.slash-command-item .description {
  color: #64748b;
  font-size: 0.875rem;
}

/* 上传按钮 */
.toolbar-btn {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
}

.toolbar-btn:hover {
  background: #f1f5f9;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/styles/globals.css
git commit -m "feat: add styles for image/video nodes, slash command panel, and upload buttons"
```

---

## Task 33: 测试与验证

**Files:**
- Modify: `packages/web/tests/shared/Editor.test.tsx`
- Modify: `packages/web/tests/shared/EditorToolbar.test.tsx`
- Modify: `packages/web/tests/shared/NoteView.test.tsx`

更新已有测试以覆盖新增功能。

- [ ] **Step 1: 更新 Editor.test.tsx**

添加测试：CustomImage 扩展注册、CustomVideo 扩展注册、SlashCommand 扩展注册、拖拽文件触发上传回调、粘贴图片触发上传回调。

- [ ] **Step 2: 更新 EditorToolbar.test.tsx**

添加测试：ImageUploadButton 渲染、VideoUploadButton 渲染、点击按钮触发文件选择。

- [ ] **Step 3: 更新 NoteView.test.tsx**

添加测试：文件上传流程、上传成功后插入节点、上传失败显示错误、斜杠命令触发上传。

- [ ] **Step 4: 运行所有 web 测试**

```bash
pnpm --filter @notes/web test
```

- [ ] **Step 5: 运行所有 core 测试**

```bash
pnpm --filter @notes/core test
```

- [ ] **Step 6: 浏览器手动验证**

启动应用 `pnpm --filter @notes/web dev`，测试：
1. 编辑器中输入 `/` → 命令面板弹出
2. 选择"图片" → 文件选择器打开 → 选择图片 → 图片显示在编辑器
3. 拖拽图片文件到编辑器 → 图片上传并显示
4. 粘贴剪贴板图片 → 上传并显示
5. NoteCard 显示缩略图
6. 切换 Markdown 模式 → 图片显示为 `![alt](attachment://id)`

- [ ] **Step 7: 修复浏览器验证中发现的问题**

- [ ] **Step 8: 最终 Commit**

```bash
git add -A
git commit -m "feat: P3 rich media extensions - image/video nodes, slash commands, attachment upload flow"
```

---

## 实施顺序总结

| Task | 内容 | 依赖 |
|------|------|------|
| 20 | 文件校验 + 图片压缩工具 | 无 |
| 21 | attachment:// 协议 + useAttachmentRenderer/useThumbnailRenderer Hook | 无 |
| 22 | 附件 Zustand Store + SlashCommand Store | 无 |
| 23 | 附件上传 Hook（含缩略图生成验证） | Task 20, 22 |
| 24 | CustomImage Node + AttachmentRenderer | Task 21 |
| 25 | CustomVideo Node + VideoRenderer | Task 21 |
| 26 | 斜杠命令扩展 + 面板 | Task 22 (slashCommandStore) |
| 27 | 上传触发 UI 按钮 | 无 |
| 28 | Editor/Toolbar 注册新扩展（Zustand state 通信） | Task 24, 25, 26, 27 |
| 29 | 拖拽/粘贴上传 + Object URL 清理 + Toast 提示 | Task 23, 28, 31b |
| 30 | Markdown 序列器更新 | Task 24, 25 |
| 31 | NoteCard 缩略图（使用 getAttachmentThumbnail） | Task 21 |
| 31b | Toast 通知组件 + useToast Hook | 无 |
| 32 | 附件样式 + Toast 样式 | Task 24, 25, 26, 27, 31b |
| 33 | 测试与验证 | 所有前置 Task |

**建议并行策略:** Task 20-22 + 31b 可并行 → Task 21, 26, 27 可并行 → Task 23, 24, 25 可并行 → 之后按依赖顺序推进。

> **P3/P4 并行开发注意事项：** P3 和 P4 都修改以下共享文件：`tiptap-setup.ts`、`EditorToolbar.tsx`、`Editor.tsx`、`markdown-serializer.ts`、`globals.css`、`NoteView.tsx`。建议 P3 先完成对这些文件的修改，P4 在 P3 基础上追加变更，避免合并冲突。