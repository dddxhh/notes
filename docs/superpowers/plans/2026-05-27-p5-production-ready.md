# P5 生产可用 Web 应用 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让笔记应用达到生产可用级别：回收站 UI 可访问、PWA 离线可用、数据可导出/导入。

**Architecture:** 回收站 UI 集成仅改 web 层布局组件，将已存在的 TrashView 接入 Sidebar/DesktopLayout/MobileDrawer/MobileLayout。PWA 用 vite-plugin-pwa 自动生成 manifest + service worker。导出/导入在 core 层新增 dumpAll/restoreAll 数据接口，web 层用 fflate 做 zip 格式转换。

**Tech Stack:** React 18, Radix UI AlertDialog, vite-plugin-pwa (Workbox), fflate (zip), @notes/core StorageAdapter

---

## Task 1: 回收站 UI — Sidebar 添加回收站入口

**Files:**

- Modify: `packages/web/src/components/desktop/Sidebar.tsx:345-358`
- Test: `packages/web/tests/desktop/Sidebar.test.tsx`

- [ ] **Step 1: 在 Sidebar 底部区域添加回收站图标按钮**

在 `Sidebar.tsx` 的 footer 区域（line 345-358），ThemeToggle 和收起按钮之间添加回收站按钮：

```tsx
// Sidebar.tsx line 348-358, 替换整个 footer div
<div
  className="flex items-center justify-between p-3 border-t"
  style={{ borderColor: "var(--border-color)" }}
>
  <div className="flex items-center gap-2">
    <ThemeToggle />
    <button
      onClick={() => useUIStore.getState().setShowTrash(true)}
      aria-label="回收站"
      className="px-2 py-1 rounded text-sm hover:opacity-80"
      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
      title="回收站"
    >
      🗑
    </button>
  </div>
  <button
    onClick={() => setSidebarOpen(false)}
    aria-label="收起侧栏"
    className="px-2 py-1 rounded text-sm hover:opacity-80"
    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
  >
    收起 ←
  </button>
</div>
```

- [ ] **Step 2: 验证 Sidebar 回收站按钮可点击**

运行 dev server 并点击回收站按钮，确认 `uiStore.showTrash` 变为 true：

```bash
pnpm --filter @notes/web dev
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/desktop/Sidebar.tsx
git commit -m "feat: add trash button in sidebar footer"
```

---

## Task 2: 回收站 UI — DesktopLayout 集成 TrashView

**Files:**

- Modify: `packages/web/src/components/layouts/DesktopLayout.tsx`

- [ ] **Step 1: 修改 DesktopLayout 条件渲染 TrashView**

当 `showTrash === true` 时主区域显示 TrashView，替代 NoteView/QuickNote：

```tsx
// DesktopLayout.tsx — 全部替换为：
import Sidebar from "../desktop/Sidebar";
import NoteView from "../NoteView";
import QuickNote from "../QuickNote";
import TrashView from "../shared/TrashView";
import { useNotesStore, useUIStore } from "../../stores";

export default function DesktopLayout() {
  const currentNote = useNotesStore((s) => s.currentNote);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const showTrash = useUIStore((s) => s.showTrash);

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {sidebarOpen && <Sidebar />}

      <div data-testid="main-area" className="flex-1 h-full flex flex-col overflow-hidden">
        <div
          className="flex items-center p-2 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="展开侧栏"
            className="p-2 rounded-md hover:opacity-80"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          >
            {sidebarOpen ? "☰" : "☰"}
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {showTrash ? (
            <TrashView />
          ) : currentNote ? (
            <NoteView key={currentNote.id} note={currentNote} />
          ) : (
            <QuickNote />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

预期：PASS，无类型错误。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/layouts/DesktopLayout.tsx
git commit -m "feat: integrate TrashView in DesktopLayout"
```

---

## Task 3: 回收站 UI — MobileDrawer 添加回收站入口

**Files:**

- Modify: `packages/web/src/components/mobile/MobileDrawer.tsx:202-232`

- [ ] **Step 1: 在 MobileDrawer 标签区域下方添加回收站链接**

在 `MobileDrawer.tsx` line 232（标签 div 的闭合 `</div>` 后面，`</Dialog.Content>` 之前），添加回收站入口：

```tsx
// MobileDrawer.tsx — 在标签 div (</div> at line 232) 之后、Dialog.Content 结束之前插入：
<div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
  <button
    onClick={() => {
      useUIStore.getState().setShowTrash(true);
      onOpenChange?.(false);
    }}
    className="text-sm px-2 py-1 rounded w-full text-left hover:opacity-80"
    style={{ color: "var(--text-secondary)" }}
  >
    🗑 回收站
  </button>
</div>
```

需要新增 import：

```tsx
import { useUIStore } from "../../stores";
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/mobile/MobileDrawer.tsx
git commit -m "feat: add trash entry in MobileDrawer"
```

---

## Task 4: 回收站 UI — MobileLayout 集成 TrashView

**Files:**

- Modify: `packages/web/src/components/layouts/MobileLayout.tsx`

- [ ] **Step 1: 修改 MobileLayout 条件渲染 TrashView**

当 `showTrash === true` 时覆盖当前屏幕显示 TrashView：

```tsx
// MobileLayout.tsx — 替换 renderScreen 函数中的逻辑
// 在现有 renderScreen 函数开头添加 showTrash 条件：

const showTrash = useUIStore((s) => s.showTrash);

const renderScreen = () => {
  if (showTrash) {
    return <TrashView />;
  }
  if (currentNote) {
    return <NoteView key={currentNote.id} note={currentNote} onBack={handleBack} />;
  }
  switch (screen) {
    case "quickNote":
      return <QuickNote />;
    case "noteList":
      return <NoteListMobile />;
    case "search":
      return <MobileSearch onSelectNote={handleSelectNoteFromSearch} />;
    case "settings":
      return <MobileSettings />;
  }
};
```

新增 import：

```tsx
import TrashView from "../shared/TrashView";
import { useUIStore } from "../../stores";
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/layouts/MobileLayout.tsx
git commit -m "feat: integrate TrashView in MobileLayout"
```

---

## Task 5: 回收站 UI — TrashView 改用 Radix AlertDialog

**Files:**

- Modify: `packages/web/src/components/shared/TrashView.tsx`

- [ ] **Step 1: 替换内联确认对话框为 Radix AlertDialog**

替换 TrashView 中 line 96-128（单条删除确认）和 line 130-161（清空回收站确认）两个内联 `<div style="z-index:100">` 为 Radix AlertDialog：

```tsx
// TrashView.tsx — 完整替换为：
import { useEffect, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useNotesStore, useUIStore } from "../../stores";
import { formatDateTime } from "../../lib/format-date";
import { isExpired } from "@notes/core";

export default function TrashView() {
  const showTrash = useUIStore((s) => s.showTrash);
  const setShowTrash = useUIStore((s) => s.setShowTrash);
  const deletedNotes = useNotesStore((s) => s.deletedNotes);
  const restoreNote = useNotesStore((s) => s.restoreNote);
  const permanentlyDeleteNote = useNotesStore((s) => s.permanentlyDeleteNote);
  const loadDeletedNotes = useNotesStore((s) => s.loadDeletedNotes);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  useEffect(() => {
    loadDeletedNotes();
  }, []);

  if (!showTrash) return null;

  const sortedNotes = [...deletedNotes].sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));

  const handleEmptyTrash = async () => {
    for (const note of deletedNotes) {
      await permanentlyDeleteNote(note.id);
    }
    setConfirmEmpty(false);
  };

  const daysRemaining = (deletedAt: number | null) => {
    if (deletedAt === null) return null;
    const remaining = 30 - Math.floor((Date.now() - deletedAt) / (24 * 60 * 60 * 1000));
    return remaining > 0 ? remaining : 0;
  };

  return (
    <div
      data-trash-view
      className="p-4 h-full"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">回收站</h2>
        <button onClick={() => setShowTrash(false)} className="text-sm hover:opacity-80">
          ✕
        </button>
      </div>

      {sortedNotes.length === 0 ? (
        <div data-empty-state className="text-center py-8 opacity-50">
          回收站为空
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {sortedNotes.map((note) => {
              const remaining = daysRemaining(note.deletedAt);
              return (
                <li
                  key={note.id}
                  data-note-id={note.id}
                  className="flex items-center justify-between p-2 rounded-md"
                  style={{ backgroundColor: "var(--bg-secondary)" }}
                >
                  <div>
                    <div className="text-sm font-medium">{note.title}</div>
                    <div className="text-xs opacity-50">
                      {formatDateTime(note.deletedAt)}
                      {remaining !== null && remaining > 0 && ` · ${remaining}天后永久删除`}
                      {remaining === 0 && " · 即将永久删除"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreNote(note.id)}
                      className="text-sm px-2 py-1 rounded-md hover:opacity-80"
                      style={{
                        backgroundColor: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      恢复
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(note.id)}
                      className="text-sm px-2 py-1 rounded-md hover:opacity-80"
                      style={{ color: "var(--danger)" }}
                    >
                      彻底删除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <button
              onClick={() => setConfirmEmpty(true)}
              className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
              style={{ color: "var(--danger)" }}
            >
              清空回收站
            </button>
          </div>
        </>
      )}

      <AlertDialog.Root
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content
            data-confirm-delete
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 rounded-lg p-4 shadow-lg"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
          >
            <AlertDialog.Title className="text-sm font-semibold mb-2">
              彻底删除笔记
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm mb-4">
              确定要彻底删除这条笔记吗？此操作不可恢复。
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                >
                  取消
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => {
                    permanentlyDeleteNote(confirmDeleteId!);
                    setConfirmDeleteId(null);
                  }}
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ color: "var(--danger)" }}
                >
                  确定
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={confirmEmpty}
        onOpenChange={(open) => {
          if (!open) setConfirmEmpty(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content
            data-confirm-empty
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 rounded-lg p-4 shadow-lg"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
          >
            <AlertDialog.Title className="text-sm font-semibold mb-2">清空回收站</AlertDialog.Title>
            <AlertDialog.Description className="text-sm mb-4">
              定要清空回收站吗？所有笔记将被永久删除，此操作不可恢复。
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                >
                  取消
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={handleEmptyTrash}
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ color: "var(--danger)" }}
                >
                  确定
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 3: 运行 TrashView 测试**

```bash
pnpm --filter @notes/web test -- tests/shared/TrashView.test.tsx
```

预期：所有测试通过（需更新测试中确认对话框的查询方式，从 `data-confirm-delete` div 改为 AlertDialog）。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/shared/TrashView.tsx
git commit -m "feat: upgrade TrashView to use Radix AlertDialog + expiry days display"
```

---

## Task 6: PWA — 安装依赖和配置 vite-plugin-pwa

**Files:**

- Modify: `packages/web/package.json`
- Modify: `packages/web/vite.config.ts`
- Create: `packages/web/public/favicon.ico`
- Create: `packages/web/public/icons/icon-192.png`
- Create: `packages/web/public/icons/icon-512.png`
- Create: `packages/web/public/robots.txt`
- Modify: `packages/web/index.html`

- [ ] **Step 1: 安装 vite-plugin-pwa**

```bash
pnpm --filter @notes/web add -D vite-plugin-pwa
```

- [ ] **Step 2: 创建应用图标**

使用 SVG 生成 PNG 图标。创建简单的蓝色背景+白色笔符号 SVG：

```bash
mkdir -p packages/web/public/icons
```

创建 `packages/web/public/icons/icon-192.png` 和 `packages/web/public/icons/icon-512.png`。如果无法直接生成 PNG，先用 SVG placeholder（后续替换为正式图标）。

创建 `packages/web/public/favicon.ico` — 可先用 16x16 PNG 转 ICO，或生成简单 favicon。

创建 `packages/web/public/robots.txt`：

```
User-agent: *
Allow: /
```

- [ ] **Step 3: 更新 vite.config.ts**

```ts
// packages/web/vite.config.ts — 全部替换为：
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import VitePWA from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "笔记",
        short_name: "笔记",
        start_url: "/",
        display: "standalone",
        background_color: "#fafafa",
        theme_color: "#3b82f6",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@notes/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["wa-sqlite"],
  },
  server: {
    port: 3000,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
```

- [ ] **Step 4: 更新 index.html**

在 `<head>` 中添加 PWA meta tags：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>笔记</title>
    <meta name="theme-color" content="#3b82f6" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 验证 build 正常**

```bash
pnpm --filter @notes/web build
```

预期：构建成功，`dist/` 目录包含 `manifest.webmanifest` 和 SW 文件。

- [ ] **Step 6: Commit**

```bash
git add packages/web/vite.config.ts packages/web/package.json packages/web/index.html packages/web/public/
git commit -m "feat: add PWA support with vite-plugin-pwa"
```

---

## Task 7: PWA — 数据持久性请求

**Files:**

- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: 在 App.tsx 中添加 navigator.storage.persist()**

在 `App.tsx` 的 `initStorage().then()` 之后，添加持久存储请求：

```tsx
// App.tsx — 修改 useEffect：
useEffect(() => {
  initStorage().then(() => {
    setReady(true);
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist();
    }
  });
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat: request persistent storage on app init"
```

---

## Task 8: 导出/导入 — core 层 DataDump 模型

**Files:**

- Create: `packages/core/src/models/data-dump.ts`
- Modify: `packages/core/src/models/index.ts`
- Modify: `packages/core/src/storage/adapter.ts`

- [ ] **Step 1: 创建 DataDump 类型**

```ts
// packages/core/src/models/data-dump.ts
import { Note, Folder, Tag, Attachment } from "./note";
import { AttachmentType } from "./attachment";

export interface DataDump {
  version: 1;
  exportedAt: number;
  folders: Folder[];
  notes: Note[];
  tags: Tag[];
  noteTags: { noteId: string; tagId: string }[];
  attachments: Attachment[];
  attachmentBlobs: { id: string; mimeType: string; data: string }[];
  thumbnails: { id: string; data: string }[];
}
```

注意：ArrayBuffer 在 JSON 序列化时转为 base64 string，所以这里 data 字段用 string 类型。

- [ ] **Step 2: 更新 models/index.ts 导出 DataDump**

```ts
// packages/core/src/models/index.ts — 在末尾添加：
export type { DataDump } from "./data-dump";
```

- [ ] **Step 3: 更新 StorageAdapter 接口添加 dumpAll/restoreAll**

```ts
// packages/core/src/storage/adapter.ts — 在 import 行添加 DataDump，在接口末尾添加：

// 更新 import：
import {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
  Attachment,
  AttachmentType,
  Tag,
  UpdateTagInput,
  SearchInput,
  SearchResult,
} from "../models";
import { DataDump } from "../models/data-dump";

// 在 StorageAdapter 接口末尾 (line 51 之后) 添加：
dumpAll(): Promise<DataDump>;
restoreAll(dump: DataDump): Promise<void>;
```

- [ ] **Step 4: 运行 core typecheck**

```bash
pnpm --filter @notes/core typecheck
```

预期：PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/models/data-dump.ts packages/core/src/models/index.ts packages/core/src/storage/adapter.ts
git commit -m "feat: add DataDump model and dumpAll/restoreAll to StorageAdapter interface"
```

---

## Task 9: 导出/导入 — WebStorageAdapter 实现 dumpAll/restoreAll

**Files:**

- Modify: `packages/core/src/storage/web-adapter.ts`
- Modify: `packages/core/src/storage/indexeddb.ts`

- [ ] **Step 1: 在 indexeddb.ts 中添加 getAllBlobs / clearAllStores 辅助函数**

```ts
// packages/core/src/storage/indexeddb.ts — 在文件末尾添加：

export async function getAllBlobKeys(storeName: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const store = getStore(storeName, "readonly");
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const store = getStore(storeName, "readwrite");
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllStores(): Promise<void> {
  await clearStore(ATTACHMENTS_STORE);
  await clearStore(THUMBNAILS_STORE);
}
```

- [ ] **Step 2: 在 web-adapter.ts 中实现 dumpAll**

```ts
// packages/core/src/storage/web-adapter.ts — 在 import 中添加新的引用：

import {
  initIndexedDB,
  closeIndexedDB,
  saveBlob,
  getBlob,
  saveThumbnail,
  getThumbnail,
  deleteBlob,
  generateImageThumbnail,
  getAllBlobKeys,
  clearAllStores,
} from "./indexeddb";

import { DataDump } from "../models/data-dump";

// 在 WebStorageAdapter 类末尾 (softDeleteNotesByFolder 方法后) 添加：

async dumpAll(): Promise<DataDump> {
  const db = this.getDB();

  const folderRows = await querySQL<Row>(db, `SELECT * FROM folders`);
  const folders = folderRows.map(mapFolderRow);

  const noteRows = await querySQL<Row>(db, `SELECT * FROM notes WHERE deleted_at IS NULL`);
  const notes = noteRows.map(mapNoteRow);

  const tagRows = await querySQL<Row>(db, `SELECT id, name FROM tags`);
  const tags = tagRows.map((r) => ({ id: r.id as string, name: r.name as string }));

  const noteTagRows = await querySQL<Row>(db, `SELECT note_id, tag_id FROM note_tags`);
  const noteTags = noteTagRows.map((r) => ({
    noteId: r.note_id as string,
    tagId: r.tag_id as string,
  }));

  const attachmentRows = await querySQL<Row>(db, `SELECT * FROM attachments WHERE note_id IN (SELECT id FROM notes WHERE deleted_at IS NULL)`);
  const attachments = attachmentRows.map((r) => ({
    id: r.id as string,
    noteId: r.note_id as string,
    type: r.type as AttachmentType,
    filename: r.filename as string,
    mimeType: r.mime_type as string,
    size: r.size as number,
    createdAt: r.created_at as number,
  }));

  const blobKeys = await getAllBlobKeys("attachments-store");
  const attachmentBlobs: { id: string; mimeType: string; data: string }[] = [];
  for (const key of blobKeys) {
    const blob = await getBlob(key);
    if (blob) {
      const buffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const att = attachments.find((a) => a.id === key);
      attachmentBlobs.push({
        id: key,
        mimeType: att?.mimeType ?? blob.type,
        data: base64,
      });
    }
  }

  const thumbKeys = await getAllBlobKeys("thumbnails-store");
  const thumbnails: { id: string; data: string }[] = [];
  for (const key of thumbKeys) {
    const blob = await getThumbnail(key);
    if (blob) {
      const buffer = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      thumbnails.push({ id: key, data: base64 });
    }
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    folders,
    notes,
    tags,
    noteTags,
    attachments,
    attachmentBlobs,
    thumbnails,
  };
}

async restoreAll(dump: DataDump): Promise<void> {
  const db = this.getDB();

  await runSQL(db, `DELETE FROM note_tags`);
  await runSQL(db, `DELETE FROM attachments`);
  await runSQL(db, `DELETE FROM notes`);
  await runSQL(db, `DELETE FROM folders`);
  await runSQL(db, `DELETE FROM tags`);
  await clearAllStores();

  for (const folder of dump.folders) {
    await runSQL(
      db,
      `INSERT INTO folders (id, name, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [folder.id, folder.name, folder.parentId, folder.sortOrder, folder.createdAt, folder.updatedAt],
    );
  }

  for (const note of dump.notes) {
    await runSQL(
      db,
      `INSERT INTO notes (id, title, content_json, md_text, folder_id, type, created_at, updated_at, deleted_at, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.title,
        note.contentJson,
        note.mdText,
        note.folderId,
        note.type,
        note.createdAt,
        note.updatedAt,
        note.deletedAt,
        note.version,
      ],
    );
  }

  for (const tag of dump.tags) {
    await runSQL(db, `INSERT INTO tags (id, name) VALUES (?, ?)`, [tag.id, tag.name]);
  }

  for (const nt of dump.noteTags) {
    await runSQL(db, `INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)`, [nt.noteId, nt.tagId]);
  }

  for (const att of dump.attachments) {
    await runSQL(
      db,
      `INSERT INTO attachments (id, note_id, type, filename, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [att.id, att.noteId, att.type, att.filename, att.mimeType, att.size, att.createdAt],
    );
  }

  for (const ab of dump.attachmentBlobs) {
    const buffer = base64ToArrayBuffer(ab.data);
    const blob = new Blob([buffer], { type: ab.mimeType });
    await saveBlob(ab.id, blob);
  }

  for (const th of dump.thumbnails) {
    const buffer = base64ToArrayBuffer(th.data);
    const blob = new Blob([buffer], { type: "image/webp" });
    await saveThumbnail(th.id, blob);
  }

  try {
    await runSQL(db, `INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);
  } catch {}
}

// 在文件末尾（mapFolderRow 函数之后）添加辅助函数：

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

- [ ] **Step 3: 运行 core typecheck**

```bash
pnpm --filter @notes/core typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/storage/web-adapter.ts packages/core/src/storage/indexeddb.ts
git commit -m "feat: implement dumpAll/restoreAll in WebStorageAdapter"
```

---

## Task 10: 导出/导入 — useStorage hook 新增 dumpAll/restoreAll

**Files:**

- Modify: `packages/web/src/hooks/useStorage.ts`

- [ ] **Step 1: 在 useStorage 中添加 dumpAll 和 restoreAll**

```ts
// packages/web/src/hooks/useStorage.ts — 在 import 中添加 DataDump：

import {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
  Tag,
  UpdateTagInput,
  SearchInput,
  SearchResult,
} from "@notes/core";
import { DataDump } from "@notes/core";

// 在 getTagsForNote 之后添加：

const dumpAll = useCallback(async (): Promise<DataDump> => {
  return getStorage().dumpAll();
}, []);

const restoreAll = useCallback(async (dump: DataDump): Promise<void> => {
  return getStorage().restoreAll(dump);
}, []);

// 在 return 对象中添加 dumpAll 和 restoreAll：
return {
  createNote,
  updateNote,
  deleteNote,
  getNote,
  listNotes,
  createFolder,
  updateFolder,
  deleteFolder,
  listFolders,
  createTag,
  updateTag,
  addTagsToNote,
  listTags,
  removeTagFromNote,
  removeTagsFromNote,
  deleteTag,
  getNotesForTag,
  searchNotes,
  updateNotesFolderId,
  softDeleteNotesByFolder,
  getTagsForNote,
  dumpAll,
  restoreAll,
};
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useStorage.ts
git commit -m "feat: add dumpAll/restoreAll to useStorage hook"
```

---

## Task 11: 导出/导入 — 安装 fflate 和创建 export.ts

**Files:**

- Modify: `packages/web/package.json` (新增 fflate dependency)
- Create: `packages/web/src/lib/export.ts`

- [ ] **Step 1: 安装 fflate**

```bash
pnpm --filter @notes/web add fflate
```

- [ ] **Step 2: 创建 export.ts**

```ts
// packages/web/src/lib/export.ts
import { DataDump } from "@notes/core";
import { zipSync } from "fflate";

function formatDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function exportAsJSON(dump: DataDump): void {
  const json = JSON.stringify(dump, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `笔记-备份-${formatDate()}.json`);
}

interface FileData {
  path: string;
  data: Uint8Array;
}

export function exportAsMarkdownZip(dump: DataDump): void {
  const files: Record<string, Uint8Array> = {};

  const folderPathMap = new Map<string, string>();
  for (const folder of dump.folders) {
    let path = folder.name;
    if (folder.parentId) {
      const parentPath = folderPathMap.get(folder.parentId) ?? "";
      path = `${parentPath}/${folder.name}`;
    }
    folderPathMap.set(folder.id, path);
  }

  const usedFilenames = new Set<string>();
  for (const note of dump.notes) {
    let filename = sanitizeFilename(note.title || `笔记-${note.id.slice(0, 8)}`);
    if (usedFilenames.has(filename)) {
      filename = `${filename}-${note.id.slice(0, 8)}`;
    }
    usedFilenames.add(filename);

    const folderPath = note.folderId ? (folderPathMap.get(note.folderId) ?? "") : "";
    const mdPath = folderPath ? `${folderPath}/${filename}.md` : `${filename}.md`;

    const encoder = new TextEncoder();
    files[mdPath] = encoder.encode(note.mdText);
  }

  for (const ab of dump.attachmentBlobs) {
    const binary = atob(ab.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const ext = getExtensionFromMimeType(ab.mimeType);
    const attPath = `attachments/${ab.id}.${ext}`;
    files[attPath] = bytes;
  }

  for (const th of dump.thumbnails) {
    const binary = atob(th.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    files[`attachments/thumbnails/${th.id}.webp`] = bytes;
  }

  const zipped = zipSync(files);
  const blob = new Blob([zipped], { type: "application/zip" });
  downloadBlob(blob, `笔记-${formatDate()}.zip`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
  };
  return map[mimeType] ?? "bin";
}
```

- [ ] **Step 3: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/export.ts packages/web/package.json
git commit -m "feat: add JSON and Markdown zip export functions"
```

---

## Task 12: 导出/导入 — 创建 import.ts

**Files:**

- Create: `packages/web/src/lib/import.ts`

- [ ] **Step 1: 创建 import.ts**

```ts
// packages/web/src/lib/import.ts
import { DataDump } from "@notes/core";
import { unzipSync } from "fflate";
import { markdownToProseMirrorJSON } from "./markdown-serializer";

export type ImportFormat = "json" | "markdown-zip" | "markdown-files";

export function detectImportFormat(file: File): ImportFormat {
  if (file.name.endsWith(".json")) return "json";
  if (file.name.endsWith(".zip")) return "markdown-zip";
  if (file.name.endsWith(".md")) return "markdown-files";
  throw new Error(`不支持的文件格式: ${file.name}`);
}

export async function importJSON(file: File): Promise<DataDump> {
  const text = await file.text();
  const dump = JSON.parse(text) as DataDump;
  if (dump.version !== 1) {
    throw new Error(`备份版本不兼容: 期望 v1，实际 v${dump.version}`);
  }
  return dump;
}

export async function importMarkdownZip(file: File): Promise<DataDump> {
  const buffer = await file.arrayBuffer();
  const entries = unzipSync(new Uint8Array(buffer));

  const folderNames = new Map<string, string>();
  const noteFiles: { path: string; content: string }[] = [];
  const attachmentFiles: { id: string; mimeType: string; data: Uint8Array }[] = [];
  const thumbnailFiles: { id: string; data: Uint8Array }[] = [];

  const decoder = new TextDecoder();

  for (const [path, data] of Object.entries(entries)) {
    if (path.startsWith("attachments/thumbnails/")) {
      const id = path.split("/").pop()?.replace(".webp", "") ?? "";
      thumbnailFiles.push({ id, data });
    } else if (path.startsWith("attachments/")) {
      const filename = path.split("/").pop() ?? "";
      const id = filename.split(".")[0];
      const ext = filename.split(".")[1] ?? "";
      const mimeType = getMimeTypeFromExtension(ext);
      attachmentFiles.push({ id, mimeType, data });
    } else if (path.endsWith(".md")) {
      const content = decoder.decode(data);
      noteFiles.push({ path, content });
      const dirPath = path.substring(0, path.lastIndexOf("/"));
      if (dirPath) {
        const parts = dirPath.split("/");
        for (const part of parts) {
          if (part && !folderNames.has(part)) {
            folderNames.set(part, generateId());
          }
        }
      }
    }
  }

  const folders: DataDump["folders"] = [];
  const folderPathToId = new Map<string, string>();
  for (const [name, id] of folderNames) {
    folders.push({
      id,
      name,
      parentId: null,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    folderPathToId.set(name, id);
  }

  const notes: DataDump["notes"] = [];
  const attachments: DataDump["attachments"] = [];
  const noteTags: DataDump["noteTags"] = [];
  const attachmentBlobs: DataDump["attachmentBlobs"] = [];
  const thumbnails: DataDump["thumbnails"] = [];

  for (const nf of noteFiles) {
    const noteId = generateId();
    const title =
      extractTitle(nf.content) || nf.path.split("/").pop()?.replace(".md", "") || noteId;
    const mdText = nf.content;
    const contentJson = JSON.stringify(markdownToProseMirrorJSON(mdText));

    const dirPath = nf.path.substring(0, nf.path.lastIndexOf("/"));
    let folderId: string | null = null;
    if (dirPath) {
      const folderName = dirPath.split("/").pop() ?? "";
      folderId = folderPathToId.get(folderName) ?? null;
    }

    notes.push({
      id: noteId,
      title,
      contentJson,
      mdText,
      folderId,
      type: "markdown",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      version: 1,
    });

    const tagMatches = nf.content.matchAll(/(?:^|\s)#([\w\u4e00-\u9fff]+)/g);
    const extractedTags = new Set<string>();
    for (const match of tagMatches) {
      extractedTags.add(match[1]);
    }
    for (const tagName of extractedTags) {
      noteTags.push({ noteId, tagId: `tag-${tagName}` });
    }
  }

  const tags: DataDump["tags"] = [];
  const uniqueTagNames = new Set<string>();
  for (const nt of noteTags) {
    const tagName = nt.tagId.replace("tag-", "");
    if (!uniqueTagNames.has(tagName)) {
      uniqueTagNames.add(tagName);
      tags.push({ id: nt.tagId, name: tagName });
    }
  }

  for (const af of attachmentFiles) {
    const noteId = notes.length > 0 ? notes[0].id : "";
    attachments.push({
      id: af.id,
      noteId,
      type: getAttachmentType(af.mimeType),
      filename: af.id + "." + getExtensionFromMimeType(af.mimeType),
      mimeType: af.mimeType,
      size: af.data.byteLength,
      createdAt: Date.now(),
    });

    const binary = "";
    const base64 = uint8ArrayToBase64(af.data);
    attachmentBlobs.push({ id: af.id, mimeType: af.mimeType, data: base64 });
  }

  for (const tf of thumbnailFiles) {
    const base64 = uint8ArrayToBase64(tf.data);
    thumbnails.push({ id: tf.id, data: base64 });
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    folders,
    notes,
    tags,
    noteTags,
    attachments,
    attachmentBlobs,
    thumbnails,
  };
}

export async function importMarkdownFiles(files: File[]): Promise<DataDump> {
  const notes: DataDump["notes"] = [];

  for (const file of files) {
    const noteId = generateId();
    const mdText = await file.text();
    const title = extractTitle(mdText) || file.name.replace(".md", "");
    const contentJson = JSON.stringify(markdownToProseMirrorJSON(mdText));

    notes.push({
      id: noteId,
      title,
      contentJson,
      mdText,
      folderId: null,
      type: "markdown",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      version: 1,
    });
  }

  return {
    version: 1,
    exportedAt: Date.now(),
    folders: [],
    notes,
    tags: [],
    noteTags: [],
    attachments: [],
    attachmentBlobs: [],
    thumbnails: [],
  };
}

function extractTitle(mdText: string): string {
  const match = mdText.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getMimeTypeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    bin: "application/octet-stream",
  };
  return map[ext] ?? "application/octet-stream";
}

function getAttachmentType(mimeType: string): "image" | "video" | "audio" | "file" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
    "application/octet-stream": "bin",
  };
  return map[mimeType] ?? "bin";
}

// 临时 ID 生成（导入时不需要与数据库 ID 兼容，restoreAll 会使用这些 ID）
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

注意：`markdownToProseMirrorJSON` 函数需要确认在 `markdown-serializer.ts` 中存在。如果名称不同需调整。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/lib/import.ts
git commit -m "feat: add JSON, Markdown zip, and Markdown file import functions"
```

---

## Task 13: 导出/导入 — ExportPanel 组件

**Files:**

- Create: `packages/web/src/components/shared/ExportPanel.tsx`

- [ ] **Step 1: 创建 ExportPanel 组件**

```tsx
// packages/web/src/components/shared/ExportPanel.tsx
import { useState } from "react";
import { useStorage } from "../../hooks";
import { exportAsJSON, exportAsMarkdownZip } from "../../lib/export";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

export default function ExportPanel() {
  const { dumpAll } = useStorage();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportJSON = async () => {
    setExporting(true);
    setError(null);
    try {
      const dump = await dumpAll();
      exportAsJSON(dump);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    setError(null);
    try {
      const dump = await dumpAll();
      exportAsMarkdownZip(dump);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">数据导出</h3>

      {exporting && (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          正在导出...
        </div>
      )}

      {error && (
        <div className="text-sm p-2 rounded" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleExportJSON}
          disabled={exporting}
          className="text-sm px-3 py-1.5 rounded-md hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          JSON 备份
        </button>
        <button
          onClick={handleExportMarkdown}
          disabled={exporting}
          className="text-sm px-3 py-1.5 rounded-md hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          Markdown 包
        </button>
      </div>

      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        JSON 备份包含完整数据（可恢复）。Markdown 包兼容 Obsidian 格式。
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/shared/ExportPanel.tsx
git commit -m "feat: add ExportPanel component"
```

---

## Task 14: 导出/导入 — ImportPanel 组件

**Files:**

- Create: `packages/web/src/components/shared/ImportPanel.tsx`

- [ ] **Step 1: 创建 ImportPanel 组件**

```tsx
// packages/web/src/components/shared/ImportPanel.tsx
import { useState, useRef } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useStorage } from "../../hooks";
import { useNotesStore, useFoldersStore, useTagsStore } from "../../stores";
import {
  detectImportFormat,
  importJSON,
  importMarkdownZip,
  importMarkdownFiles,
} from "../../lib/import";
import type { ImportFormat } from "../../lib/import";
import type { DataDump } from "@notes/core";

export default function ImportPanel() {
  const { restoreAll, listNotes, listFolders, listTags } = useStorage();
  const setNotes = useNotesStore((s) => s.setNotes);
  const setFolders = useFoldersStore((s) => s.setFolders);
  const setTags = useTagsStore((s) => s.setTags);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDump, setPendingDump] = useState<DataDump | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setImporting(true);

    try {
      const format = detectImportFormat(files[0]);

      if (format === "json") {
        const dump = await importJSON(files[0]);
        setPendingDump(dump);
        setConfirmOpen(true);
      } else if (format === "markdown-zip") {
        const dump = await importMarkdownZip(files[0]);
        setPendingDump(dump);
        setConfirmOpen(true);
      } else if (format === "markdown-files") {
        const dump = await importMarkdownFiles(Array.from(files));
        setPendingDump(dump);
        setConfirmOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingDump) return;
    setImporting(true);
    setError(null);
    try {
      await restoreAll(pendingDump);
      const notes = await listNotes();
      setNotes(notes);
      const folders = await listFolders();
      setFolders(folders);
      const tags = await listTags();
      setTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
      setConfirmOpen(false);
      setPendingDump(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">数据导入</h3>

      {importing && (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          正在导入...
        </div>
      )}

      {error && (
        <div className="text-sm p-2 rounded" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}

      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="text-sm px-3 py-1.5 rounded-md hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: "var(--accent)", color: "white" }}
      >
        选择文件导入
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.zip,.md"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        支持 JSON 备份、Markdown 包（zip）、Markdown 文件（.md）。导入将替换现有数据。
      </p>

      <AlertDialog.Root
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setPendingDump(null);
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-4 shadow-lg"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
          >
            <AlertDialog.Title className="text-sm font-semibold mb-2">确认导入</AlertDialog.Title>
            <AlertDialog.Description className="text-sm mb-4">
              导入将替换所有现有数据。建议先导出当前数据作为备份。确定继续？
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                >
                  取消
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={handleConfirmImport}
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ color: "var(--danger)" }}
                >
                  确定导入
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/shared/ImportPanel.tsx
git commit -m "feat: add ImportPanel component"
```

---

## Task 15: 导出/导入 — MobileSettings 替换占位

**Files:**

- Modify: `packages/web/src/components/mobile/MobileSettings.tsx`

- [ ] **Step 1: 替换"导入/导出功能开发中…"占位为实际组件**

```tsx
// packages/web/src/components/mobile/MobileSettings.tsx — 全部替换为：
import ThemeToggle from "../shared/ThemeToggle";
import ModeToggle from "../shared/ModeToggle";
import ExportPanel from "../shared/ExportPanel";
import ImportPanel from "../shared/ImportPanel";

export default function MobileSettings() {
  return (
    <div
      className="flex flex-col h-screen p-4 space-y-6"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <h2 className="text-lg font-bold">设置</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">主题</h3>
        <ThemeToggle />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">编辑模式</h3>
        <ModeToggle />
      </div>

      <div
        className="space-y-3 p-3 rounded-md"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-color)" }}
      >
        <ExportPanel />
        <div className="border-t" style={{ borderColor: "var(--border-color)" }} />
        <ImportPanel />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">关于</h3>
        <div className="p-3 rounded-md" style={{ backgroundColor: "var(--bg-secondary)" }}>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Notes App v0.0.1
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            本地优先 · 私密安全
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/mobile/MobileSettings.tsx
git commit -m "feat: replace import/export placeholder with actual panels in MobileSettings"
```

---

## Task 16: 导出/导入 — Desktop 设置入口

**Files:**

- Create: `packages/web/src/components/shared/DataManagementPanel.tsx`
- Modify: `packages/web/src/components/desktop/Sidebar.tsx`

- [ ] **Step 1: 创建 DataManagementPanel 组件**

```tsx
// packages/web/src/components/shared/DataManagementPanel.tsx
import ExportPanel from "./ExportPanel";
import ImportPanel from "./ImportPanel";
import * as Dialog from "@radix-ui/react-dialog";

interface DataManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DataManagementPanel({ open, onOpenChange }: DataManagementPanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 max-h-[80vh] rounded-lg p-6 overflow-auto shadow-lg z-50"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">数据管理</Dialog.Title>
          <Dialog.Close asChild>
            <button
              aria-label="关闭"
              className="absolute top-3 right-3 p-2 rounded-md hover:opacity-80"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              ✕
            </button>
          </Dialog.Close>

          <ExportPanel />
          <div className="border-t my-4" style={{ borderColor: "var(--border-color)" }} />
          <ImportPanel />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: 在 Sidebar footer 添加设置图标按钮**

在 `Sidebar.tsx` footer 区域，回收站按钮右侧添加设置图标按钮：

```tsx
// Sidebar.tsx — footer 区域修改为：

import DataManagementPanel from "../shared/DataManagementPanel";

// 在 Sidebar 组件内部添加 state：
const [showDataManagement, setShowDataManagement] = useState(false);

// footer div 替换为：
<div
  className="flex items-center justify-between p-3 border-t"
  style={{ borderColor: "var(--border-color)" }}
>
  <div className="flex items-center gap-2">
    <ThemeToggle />
    <button
      onClick={() => useUIStore.getState().setShowTrash(true)}
      aria-label="回收站"
      className="px-2 py-1 rounded text-sm hover:opacity-80"
      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
      title="回收站"
    >
      🗑
    </button>
    <button
      onClick={() => setShowDataManagement(true)}
      aria-label="数据管理"
      className="px-2 py-1 rounded text-sm hover:opacity-80"
      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
      title="数据管理"
    >
      ⚙️
    </button>
  </div>
  <button
    onClick={() => setSidebarOpen(false)}
    aria-label="收起侧栏"
    className="px-2 py-1 rounded text-sm hover:opacity-80"
    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
  >
    收起 ←
  </button>
</div>

<DataManagementPanel open={showDataManagement} onOpenChange={setShowDataManagement} />
```

- [ ] **Step 3: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/shared/DataManagementPanel.tsx packages/web/src/components/desktop/Sidebar.tsx
git commit -m "feat: add DataManagementPanel with export/import for desktop"
```

---

## Task 17: 全局验证 — typecheck + lint + format:check + test

**Files:** 无新增，验证所有改动

- [ ] **Step 1: 运行完整验证**

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

预期：所有检查通过。如有失败，修复后重新运行。

- [ ] **Step 2: 手动功能验证**

1. 启动 `pnpm dev`，在桌面端：
   - 点击 Sidebar 底部回收站按钮 → TrashView 显示
   - 点击 TrashView 关闭按钮 → 回到之前视图
   - 删除一条笔记 → 回收站中出现 → 恢复 → 笔记回到列表
2. 在移动端：
   - 打开 MobileDrawer → 点击回收站 → TrashView 显示
3. 点击 Sidebar 底部 ⚙️ 按钮 → DataManagementPanel 弹出
4. 导出 JSON 备份 → 下载文件成功
5. 导入 JSON 备份 → 数据恢复
6. 验证 PWA：`pnpm build` 后 `pnpm preview`，检查 manifest 和 SW 注册

- [ ] **Step 3: 最终 Commit（如有修复）**

```bash
git add -A
git commit -m "fix: resolve P5 verification issues"
```
