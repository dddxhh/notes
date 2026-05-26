# 侧栏笔记列表功能增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强笔记应用侧栏的 4 个功能：未命名笔记显示优化、侧栏新建/删除笔记、笔记卡片显示标签、文件夹管理增强。

**Architecture:** 纯前端改动为主（React + Zustand + Radix UI），数据层新增 2 个批量 SQL 方法（StorageAdapter 接口扩展）。遵循现有 monorepo 双包架构：core 包改数据层，web 包改 UI 和状态管理。

**Tech Stack:** React 18, Zustand, Radix UI (Popover/DropdownMenu/Dialog/Tooltip/AlertDialog), @tanstack/react-virtual, wa-sqlite, TipTap

---

## File Structure

### Core 包 — 数据层

| 文件                                              | 责任                                     |
| ------------------------------------------------- | ---------------------------------------- |
| `packages/core/src/storage/adapter.ts`            | StorageAdapter 接口新增 2 个批量方法签名 |
| `packages/core/src/storage/web-adapter.ts`        | 实现批量方法（WebStorageAdapter）        |
| `packages/core/src/storage/sqlite.ts`             | 无改动（DDL 和 runSQL/querySQL 不变）    |
| `packages/core/tests/storage/web-adapter.test.ts` | 新增批量方法测试                         |

### Web 包 — UI 和状态层

| 文件                                                         | 责任                                               |
| ------------------------------------------------------------ | -------------------------------------------------- |
| `packages/web/src/components/shared/NoteCard.tsx`            | 3 个功能叠加：extractTitle、"⋯"菜单、tags overflow |
| `packages/web/src/components/shared/DeleteNoteDialog.tsx`    | **新建** — 确认删除笔记对话框                      |
| `packages/web/src/components/shared/DeleteFolderDialog.tsx`  | **新建** — 删除文件夹确认对话框（含复选框）        |
| `packages/web/src/components/shared/NoteCardMenu.tsx`        | **新建** — NoteCard 的 "⋯" 下拉菜单组件            |
| `packages/web/src/components/desktop/Sidebar.tsx`            | 新增"新建"按钮、传递 tags 数据                     |
| `packages/web/src/components/desktop/FolderTreeDropdown.tsx` | 增加创建/删除/重命名操作                           |
| `packages/web/src/components/mobile/NoteListMobile.tsx`      | 新建按钮适配、传递 tags 数据                       |
| `packages/web/src/components/mobile/MobileDrawer.tsx`        | 文件夹管理操作适配                                 |
| `packages/web/src/components/NoteView.tsx`                   | 接通 noop 回调                                     |
| `packages/web/src/lib/sqlite-shared-worker.ts`               | SharedWorkerStorageAdapter 实现批量方法            |
| `packages/web/src/lib/useStorage.ts`                         | 新增批量方法 wrapper                               |
| `packages/web/src/stores/notesStore.ts`                      | 新增 noteTagsMap 状态                              |
| `packages/web/src/stores/foldersStore.ts`                    | 增加 updateFolderInList action                     |

---

## Task 1: 未命名笔记显示优化

**Files:**

- Modify: `packages/web/src/components/shared/NoteCard.tsx:58-59`
- Test: `packages/web/tests/lib/markdown-serializer.test.ts` (已有 extractTitleFromContent 测试)

- [ ] **Step 1: 修改 NoteCard — 引入 extractTitleFromContent 并替换显示逻辑**

修改 `packages/web/src/components/shared/NoteCard.tsx`:

在文件顶部新增 import:

```typescript
import { extractTitleFromContent } from "../../lib/markdown-serializer";
```

替换 line 58-59 的标题显示区域。将:

```tsx
<div className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
  {note.title || "未命名笔记"}
</div>
```

改为:

```tsx
<div className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
  {note.title || (
    <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
      {extractTitleFromContent(note.mdText)}
    </span>
  )}
</div>
```

- [ ] **Step 2: 运行 typecheck 验证**

Run: `pnpm typecheck`
Expected: PASS，无类型错误

- [ ] **Step 3: 运行 lint 验证**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/shared/NoteCard.tsx
git commit -m "feat: 用内容首行替代未命名笔记显示，淡色斜体区分"
```

---

## Task 2: 数据层 — 新增批量方法

**Files:**

- Modify: `packages/core/src/storage/adapter.ts:15-48`
- Modify: `packages/core/src/storage/web-adapter.ts:361` (class 结尾前)
- Modify: `packages/web/src/lib/sqlite-shared-worker.ts:673` (class 结尾前)
- Modify: `packages/web/src/hooks/useStorage.ts:78-94` (return 块)
- Test: `packages/core/tests/storage/web-adapter.test.ts`

- [ ] **Step 1: StorageAdapter 接口新增 2 个方法签名**

修改 `packages/core/src/storage/adapter.ts`，在 `deleteFolder` 后面（line 28 之后）新增:

```typescript
updateNotesFolderId(oldFolderId: string, newFolderId: string | null): Promise<void>;
softDeleteNotesByFolder(folderId: string): Promise<void>;
```

- [ ] **Step 2: WebStorageAdapter 实现批量方法**

修改 `packages/core/src/storage/web-adapter.ts`，在 `getNotesForTag` 方法后（line 360 之后，class 结尾 `}` 之前）新增:

```typescript
async updateNotesFolderId(oldFolderId: string, newFolderId: string | null): Promise<void> {
  const db = this.getDB();
  await runSQL(db, `UPDATE notes SET folder_id=?, updated_at=? WHERE folder_id=? AND deleted_at IS NULL`, [
    newFolderId,
    Date.now(),
    oldFolderId,
  ]);
}

async softDeleteNotesByFolder(folderId: string): Promise<void> {
  const db = this.getDB();
  await runSQL(db, `UPDATE notes SET deleted_at=?, updated_at=? WHERE folder_id=? AND deleted_at IS NULL`, [
    Date.now(),
    Date.now(),
    folderId,
  ]);
  await this.rebuildFTS5(db);
}
```

需要确认 `rebuildFTS5` 方法已存在于 `WebStorageAdapter`。查看 `web-adapter.ts` line 126-131 的 `deleteNote` 方法和 line 133-139 的 `permanentlyDeleteNote` 都调用了 `rebuildFTS5`。该方法存在。

- [ ] **Step 3: SharedWorkerStorageAdapter 实现批量方法**

修改 `packages/web/src/lib/sqlite-shared-worker.ts`，在 `getNotesForTag` 方法后（line 672 之后，class 结尾 `}` 之前）新增:

```typescript
async updateNotesFolderId(oldFolderId: string, newFolderId: string | null): Promise<void> {
  await this.client.run(
    `UPDATE notes SET folder_id=?, updated_at=? WHERE folder_id=? AND deleted_at IS NULL`,
    [newFolderId, Date.now(), oldFolderId],
  );
  this.notifyDataChange(["notes"]);
}

async softDeleteNotesByFolder(folderId: string): Promise<void> {
  await this.client.run(
    `UPDATE notes SET deleted_at=?, updated_at=? WHERE folder_id=? AND deleted_at IS NULL`,
    [Date.now(), Date.now(), folderId],
  );
  this.notifyDataChange(["notes"]);
}
```

确认 `notifyDataChange` 方法存在：查看 line 227 `this.notifyDataChange(["notes"])` 的使用模式，该方法在 SharedWorkerStorageAdapter 类中已定义。

- [ ] **Step 4: useStorage hook 新增 wrapper**

修改 `packages/web/src/hooks/useStorage.ts`，在 `searchNotes` callback 后新增两个 wrapper:

```typescript
const updateNotesFolderId = useCallback(
  async (oldFolderId: string, newFolderId: string | null): Promise<void> => {
    return getStorage().updateNotesFolderId(oldFolderId, newFolderId);
  },
  [],
);

const softDeleteNotesByFolder = useCallback(async (folderId: string): Promise<void> => {
  return getStorage().softDeleteNotesByFolder(folderId);
}, []);
```

在 return 块中新增:

```typescript
updateNotesFolderId,
softDeleteNotesByFolder,
```

- [ ] **Step 5: 编写测试 — web-adapter 批量方法**

在 `packages/core/tests/storage/web-adapter.test.ts` 中追加测试:

```typescript
describe("WebStorageAdapter batch methods", () => {
  it("updateNotesFolderId moves all notes from one folder to another", async () => {
    const folder1 = await adapter.createFolder({ name: "folder1" });
    const folder2 = await adapter.createFolder({ name: "folder2" });
    await adapter.createNote({ title: "note1", folderId: folder1.id });
    await adapter.createNote({ title: "note2", folderId: folder1.id });

    await adapter.updateNotesFolderId(folder1.id, folder2.id);

    const notes = await adapter.listNotes(folder2.id);
    expect(notes.length).toBe(2);
  });

  it("updateNotesFolderId sets folderId to null when newFolderId is null", async () => {
    const folder = await adapter.createFolder({ name: "folder" });
    await adapter.createNote({ title: "note", folderId: folder.id });

    await adapter.updateNotesFolderId(folder.id, null);

    const allNotes = await adapter.listNotes();
    const note = allNotes.find((n) => n.title === "note");
    expect(note?.folderId).toBeNull();
  });

  it("softDeleteNotesByFolder soft-deletes all notes in a folder", async () => {
    const folder = await adapter.createFolder({ name: "folder" });
    await adapter.createNote({ title: "note1", folderId: folder.id });
    await adapter.createNote({ title: "note2", folderId: folder.id });

    await adapter.softDeleteNotesByFolder(folder.id);

    const activeNotes = await adapter.listNotes(folder.id);
    expect(activeNotes.length).toBe(0);
  });
});
```

- [ ] **Step 6: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 7: 运行 core 单元测试**

Run: `pnpm --filter @notes/core test`
Expected: PASS（包含新增的批量方法测试）

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/storage/adapter.ts packages/core/src/storage/web-adapter.ts packages/web/src/lib/sqlite-shared-worker.ts packages/web/src/hooks/useStorage.ts packages/core/tests/storage/web-adapter.test.ts
git commit -m "feat: 新增 updateNotesFolderId 和 softDeleteNotesByFolder 批量方法"
```

---

## Task 3: 侧栏新建笔记按钮

**Files:**

- Modify: `packages/web/src/components/desktop/Sidebar.tsx:107-115` (顶部区域)
- Modify: `packages/web/src/components/mobile/NoteListMobile.tsx:71-76` (顶部区域)

- [ ] **Step 1: Sidebar — 顶部新增"新建"按钮**

修改 `packages/web/src/components/desktop/Sidebar.tsx`:

新增 import:

```typescript
import { useStorage } from "../../hooks";
```

(注意：`useSearch` 已经从 `../../hooks` 导入了，可以合并到一行)

在组件函数中新增（在现有 `const { getNotesForTag, deleteTag } = useStorage();` 后面追加）:

```typescript
const { createNote } = useStorage();
```

(注意：已有 `const { getNotesForTag, deleteTag } = useStorage();` 在 line 19，需要合并为一次调用)

替换 line 19 的 useStorage 调用:

```typescript
const { getNotesForTag, deleteTag, createNote } = useStorage();
```

新增 handleNewNote callback:

```typescript
const handleNewNote = useCallback(async () => {
  const note = await createNote({ title: "" });
  addNote(note);
  setCurrentNote(note);
}, [createNote, addNote, setCurrentNote]);
```

需要新增 `addNote` 从 store:

```typescript
const addNote = useNotesStore((s) => s.addNote);
```

修改顶部区域的 JSX (line 107-115)，将:

```tsx
<div className="p-3 space-y-2 border-b" style={{ borderColor: "var(--border-color)" }}>
  <FolderTreeDropdown />
  <SearchBar ... />
</div>
```

改为:

```tsx
<div className="p-3 space-y-2 border-b" style={{ borderColor: "var(--border-color)" }}>
  <div className="flex items-center gap-2">
    <FolderTreeDropdown />
    <button
      onClick={handleNewNote}
      className="px-2 py-1 rounded-md text-sm hover:opacity-80"
      style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
    >
      + 新建
    </button>
  </div>
  <SearchBar
    query={searchInput.query || ""}
    onQueryChange={(q) => updateFilter({ query: q })}
    showFilter={showFilter}
    onToggleFilter={() => setShowFilter(!showFilter)}
  />
</div>
```

- [ ] **Step 2: NoteListMobile — 顶部新增"新建"按钮**

修改 `packages/web/src/components/mobile/NoteListMobile.tsx`:

在 `useStorage` 返回中追加 `createNote`:

```typescript
const { listNotes, listFolders, getNotesForTag, createNote } = useStorage();
```

新增 `addNote` 从 store:

```typescript
const addNote = useNotesStore((s) => s.addNote);
```

新增 handleNewNote:

```typescript
const handleNewNote = useCallback(async () => {
  const note = await createNote({ title: "" });
  addNote(note);
  setCurrentNote(note);
}, [createNote, addNote, setCurrentNote]);
```

修改顶部 header (line 72-76)，将:

```tsx
<div className="p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
    ← 全部笔记
  </h2>
</div>
```

改为:

```tsx
<div
  className="p-3 border-b flex items-center justify-between"
  style={{ borderColor: "var(--border-color)" }}
>
  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
    ← 全部笔记
  </h2>
  <button
    onClick={handleNewNote}
    className="px-3 py-1 rounded-md text-sm hover:opacity-80"
    style={{ backgroundColor: "var(--accent)", color: "white" }}
  >
    + 新建
  </button>
</div>
```

- [ ] **Step 3: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/desktop/Sidebar.tsx packages/web/src/components/mobile/NoteListMobile.tsx
git commit -m "feat: 侧栏和移动端顶部新增新建笔记按钮"
```

---

## Task 4: NoteCard "⋯" 菜单和删除笔记

**Files:**

- Create: `packages/web/src/components/shared/NoteCardMenu.tsx`
- Create: `packages/web/src/components/shared/DeleteNoteDialog.tsx`
- Modify: `packages/web/src/components/shared/NoteCard.tsx:21-72`
- Modify: `packages/web/src/components/desktop/Sidebar.tsx:145-165` (虚拟列表 NoteCard 渲染)
- Modify: `packages/web/src/components/mobile/NoteListMobile.tsx:103-127` (虚拟列表 NoteCard 渲染)

- [ ] **Step 1: 创建 NoteCardMenu 组件**

创建 `packages/web/src/components/shared/NoteCardMenu.tsx`:

```tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface NoteCardMenuProps {
  onDelete: () => void;
  onMoveToFolder: () => void;
  onCopyMarkdown: () => void;
}

export default function NoteCardMenu({
  onDelete,
  onMoveToFolder,
  onCopyMarkdown,
}: NoteCardMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="px-1 rounded hover:opacity-80 text-sm group-hover:opacity-100 opacity-0 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
          aria-label="更多操作"
        >
          ⋯
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 rounded-md p-1 shadow-lg w-48"
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
          align="end"
          sideOffset={4}
        >
          <DropdownMenu.Item
            onClick={onMoveToFolder}
            className="px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          >
            移动到文件夹
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={onCopyMarkdown}
            className="px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          >
            复制 Markdown
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={onDelete}
            className="px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
            style={{ color: "var(--danger)" }}
          >
            删除笔记
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

- [ ] **Step 2: 创建 DeleteNoteDialog 组件**

创建 `packages/web/src/components/shared/DeleteNoteDialog.tsx`:

```tsx
import * as AlertDialog from "@radix-ui/react-alert-dialog";

interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle: string;
  onConfirm: () => void;
}

export default function DeleteNoteDialog({
  open,
  onOpenChange,
  noteTitle,
  onConfirm,
}: DeleteNoteDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-6 shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <AlertDialog.Title className="text-lg font-bold mb-2">删除笔记</AlertDialog.Title>
          <AlertDialog.Description className="text-sm mb-4">
            确定要删除笔记"{noteTitle}"吗？删除后可在回收站中恢复。
          </AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                className="rounded-md px-3 py-1.5 hover:opacity-80"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                取消
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={onConfirm}
                className="rounded-md px-3 py-1.5 font-medium text-white bg-red-500 hover:bg-red-600"
              >
                删除
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
```

- [ ] **Step 3: 修改 NoteCard — 增加"⋯"菜单按钮**

修改 `packages/web/src/components/shared/NoteCard.tsx`:

在 NoteCardProps interface 中新增 menu 回调:

```typescript
interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  tags?: { id: string; name: string }[];
  attachments?: Attachment[];
  onDelete?: (note: Note) => void;
  onMoveToFolder?: (note: Note) => void;
  onCopyMarkdown?: (note: Note) => void;
}
```

新增 import:

```typescript
import { extractTitleFromContent } from "../../lib/markdown-serializer";
import NoteCardMenu from "./NoteCardMenu";
import DeleteNoteDialog from "./DeleteNoteDialog";
import { useState } from "react";
```

修改组件函数签名:

```typescript
export default function NoteCard({ note, onClick, tags, attachments, onDelete, onMoveToFolder, onCopyMarkdown }: NoteCardProps) {
```

新增 state:

```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [moveDialogOpen, setMoveDialogOpen] = useState(false);
```

标题显示部分 — 在 `<div className="flex-1 min-w-0">` 内，将标题行改为包含菜单:

```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-start justify-between gap-1">
    <div className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
      {note.title || (
        <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
          {extractTitleFromContent(note.mdText)}
        </span>
      )}
    </div>
    {(onDelete || onMoveToFolder) && (
      <div className="flex-shrink-0 group">
        <NoteCardMenu
          onDelete={() => setDeleteDialogOpen(true)}
          onMoveToFolder={() => setMoveDialogOpen(true)}
          onCopyMarkdown={() => onCopyMarkdown?.(note)}
        />
      </div>
    )}
  </div>
```

在 `<button>` 外层 `<div>` 上添加 `group` class 使菜单 hover 显示:

```tsx
<button
  onClick={() => onClick(note)}
  className="block w-full p-3 rounded-lg hover:shadow-sm transition-colors text-left group"
```

在组件 JSX 末尾添加对话框（在 `<button>` 后面）:

```tsx
<DeleteNoteDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  noteTitle={note.title || extractTitleFromContent(note.mdText)}
  onConfirm={() => {
    onDelete?.(note);
    setDeleteDialogOpen(false);
  }}
/>
```

注意: `onMoveToFolder` 的 MoveNoteDialog 已经是独立组件（在 ContextMenu 中使用），需要在 NoteCard 中也引入。但为了简化，"移动到文件夹"菜单项只触发回调，MoveNoteDialog 由父组件（Sidebar）控制。所以 NoteCardMenu 的 `onMoveToFolder` 回调触发时，需要通知父组件打开 MoveNoteDialog。

**调整方案**：NoteCardMenu 的 `onMoveToFolder` 改为直接回调，由 Sidebar 管理 MoveNoteDialog 状态。

将 `setMoveDialogOpen(true)` 改为调用 prop:

```tsx
onMoveToFolder={() => onMoveToFolder?.(note)}
```

删除 `moveDialogOpen` state（不需要在 NoteCard 内部管理）。

- [ ] **Step 4: 修改 Sidebar — 传递菜单回调和管理删除/移动对话框**

修改 `packages/web/src/components/desktop/Sidebar.tsx`:

新增 import:

```typescript
import DeleteNoteDialog from "../shared/DeleteNoteDialog";
import MoveNoteDialog from "../shared/MoveNoteDialog";
```

新增 state:

```typescript
const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
const [moveNoteFolderId, setMoveNoteFolderId] = useState<string | null>(null);
```

新增 useStorage 方法:

```typescript
const { getNotesForTag, deleteTag, createNote, deleteNote, updateNote } = useStorage();
```

新增回调:

```typescript
const handleDeleteNote = useCallback(async () => {
  if (!deleteNoteId) return;
  await deleteNote(deleteNoteId);
  removeNoteFromList(deleteNoteId);
  setDeleteNoteId(null);
}, [deleteNoteId, deleteNote, removeNoteFromList]);

const handleMoveToFolder = useCallback(
  async (targetFolderId: string) => {
    if (!moveNoteId) return;
    await updateNote(moveNoteId, { folderId: targetFolderId });
    const store = useNotesStore.getState();
    store.updateNoteInList(moveNoteId, { id: moveNoteId, folderId: targetFolderId });
    setMoveNoteId(null);
    setMoveNoteFolderId(null);
  },
  [moveNoteId, updateNote],
);
```

需要新增 `removeNoteFromList`:

```typescript
const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
```

修改 NoteCard 渲染（line 161），将:

```tsx
<NoteCard note={note} onClick={setCurrentNote} />
```

改为:

```tsx
<NoteCard
  note={note}
  onClick={setCurrentNote}
  onDelete={(n) => setDeleteNoteId(n.id)}
  onMoveToFolder={(n) => {
    setMoveNoteId(n.id);
    setMoveNoteFolderId(n.folderId);
  }}
  onCopyMarkdown={(n) => navigator.clipboard.writeText(n.mdText)}
/>
```

在 `DeleteTagDialog` 之前新增两个对话框:

```tsx
<DeleteNoteDialog
  open={deleteNoteId !== null}
  onOpenChange={(open) => { if (!open) setDeleteNoteId(null); }}
  noteTitle={deleteNoteId ? (finalNotes.find((n) => n.id === deleteNoteId)?.title || extractTitleFromContent(finalNotes.find((n) => n.id === deleteNoteId)?.mdText || "")) : ""}
  onConfirm={handleDeleteNote}
/>
<MoveNoteDialog
  open={moveNoteId !== null}
  onOpenChange={(open) => { if (!open) { setMoveNoteId(null); setMoveNoteFolderId(null); } }}
  noteId={moveNoteId ?? ""}
  currentFolderId={moveNoteFolderId}
  onMove={handleMoveToFolder}
/>
```

新增 import `extractTitleFromContent`:

```typescript
import { extractTitleFromContent } from "../../lib/markdown-serializer";
```

- [ ] **Step 5: 修改 NoteListMobile — 同样适配菜单回调**

修改 `packages/web/src/components/mobile/NoteListMobile.tsx`:

在 useStorage 返回中追加:

```typescript
const { listNotes, listFolders, getNotesForTag, createNote, deleteNote, updateNote } = useStorage();
```

新增 state:

```typescript
const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
const [moveNoteFolderId, setMoveNoteFolderId] = useState<string | null>(null);
```

新增 import:

```typescript
import DeleteNoteDialog from "../shared/DeleteNoteDialog";
import MoveNoteDialog from "../shared/MoveNoteDialog";
import { extractTitleFromContent } from "../../lib/markdown-serializer";
```

新增回调:

```typescript
const handleDeleteNote = useCallback(async () => {
  if (!deleteNoteId) return;
  await deleteNote(deleteNoteId);
  removeNoteFromList(deleteNoteId);
  setDeleteNoteId(null);
}, [deleteNoteId, deleteNote, removeNoteFromList]);

const handleMoveToFolder = useCallback(
  async (targetFolderId: string) => {
    if (!moveNoteId) return;
    await updateNote(moveNoteId, { folderId: targetFolderId });
    useNotesStore
      .getState()
      .updateNoteInList(moveNoteId, { id: moveNoteId, folderId: targetFolderId });
    setMoveNoteId(null);
    setMoveNoteFolderId(null);
  },
  [moveNoteId, updateNote],
);
```

需要新增 `removeNoteFromList`:

```typescript
const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
```

修改 NoteCard 渲染，将:

```tsx
<NoteCard key={note.id} note={note} onClick={setCurrentNote} />
```

改为:

```tsx
<NoteCard
  key={note.id}
  note={note}
  onClick={setCurrentNote}
  onDelete={(n) => setDeleteNoteId(n.id)}
  onMoveToFolder={(n) => {
    setMoveNoteId(n.id);
    setMoveNoteFolderId(n.folderId);
  }}
  onCopyMarkdown={(n) => navigator.clipboard.writeText(n.mdText)}
/>
```

在组件 JSX 末尾添加对话框:

```tsx
<DeleteNoteDialog
  open={deleteNoteId !== null}
  onOpenChange={(open) => { if (!open) setDeleteNoteId(null); }}
  noteTitle={deleteNoteId ? (activeNotes.find((n) => n.id === deleteNoteId)?.title || extractTitleFromContent(activeNotes.find((n) => n.id === deleteNoteId)?.mdText || "")) : ""}
  onConfirm={handleDeleteNote}
/>
<MoveNoteDialog
  open={moveNoteId !== null}
  onOpenChange={(open) => { if (!open) { setMoveNoteId(null); setMoveNoteFolderId(null); } }}
  noteId={moveNoteId ?? ""}
  currentFolderId={moveNoteFolderId}
  onMove={handleMoveToFolder}
/>
```

- [ ] **Step 6: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 7: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/web/src/components/shared/NoteCardMenu.tsx packages/web/src/components/shared/DeleteNoteDialog.tsx packages/web/src/components/shared/NoteCard.tsx packages/web/src/components/desktop/Sidebar.tsx packages/web/src/components/mobile/NoteListMobile.tsx
git commit -m "feat: NoteCard 增加菜单按钮，侧栏和移动端支持删除和移动笔记"
```

---

## Task 5: NoteView 接通 noop 回调

**Files:**

- Modify: `packages/web/src/components/NoteView.tsx:143-148`

- [ ] **Step 1: 接通 handleContextMenuDelete**

修改 `packages/web/src/components/NoteView.tsx`:

将 line 143 的 noop:

```typescript
const handleContextMenuDelete = useCallback((_id: string) => {}, []);
```

改为:

```typescript
const handleContextMenuDelete = useCallback(
  async (id: string) => {
    await deleteNote(id);
    removeNoteFromList(id);
    const store = useNotesStore.getState();
    if (store.currentNote?.id === id) {
      store.setCurrentNote(null);
    }
  },
  [deleteNote, removeNoteFromList],
);
```

需要在 useStorage 返回中追加 `deleteNote`:

```typescript
const { updateNote, addTagsToNote, removeTagFromNote, createTag, deleteNote } = useStorage();
```

需要新增 `removeNoteFromList` 从 store:

```typescript
const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
```

- [ ] **Step 2: 接通 handleContextMenuMoveToFolder**

将 line 144-146 的 noop:

```typescript
const handleContextMenuMoveToFolder = useCallback((_id: string, _targetFolderId: string) => {}, []);
```

改为:

```typescript
const handleContextMenuMoveToFolder = useCallback(
  async (id: string, targetFolderId: string) => {
    await updateNote(id, { folderId: targetFolderId });
    const store = useNotesStore.getState();
    store.updateNoteInList(id, { id, folderId: targetFolderId });
    if (store.currentNote?.id === id) {
      store.setCurrentNote({ ...store.currentNote, folderId: targetFolderId });
    }
  },
  [updateNote],
);
```

- [ ] **Step 3: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/NoteView.tsx
git commit -m "feat: 接通 NoteView 删除和移动文件夹回调"
```

---

## Task 6: 笔记卡片标签显示

**Files:**

- Modify: `packages/web/src/components/shared/NoteCard.tsx` (tags overflow 区域)
- Modify: `packages/web/src/stores/notesStore.ts`
- Modify: `packages/web/src/components/desktop/Sidebar.tsx`
- Modify: `packages/web/src/components/mobile/NoteListMobile.tsx`

- [ ] **Step 1: notesStore 新增 noteTagsMap**

修改 `packages/web/src/stores/notesStore.ts`:

在 `NotesState` interface 中新增:

```typescript
noteTagsMap: Map<string, Tag[]>;
setNoteTagsMap: (map: Map<string, Tag[]>) => void;
updateNoteTags: (noteId: string, tags: Tag[]) => void;
removeNoteTags: (noteId: string) => void;
```

需要新增 Tag import:

```typescript
import { Note, Tag } from "@notes/core";
```

在 `create` 函数中新增:

```typescript
noteTagsMap: new Map(),
setNoteTagsMap: (map) => set({ noteTagsMap: map }),
updateNoteTags: (noteId, tags) =>
  set((state) => {
    const next = new Map(state.noteTagsMap);
    next.set(noteId, tags);
    return { noteTagsMap: next };
  }),
removeNoteTags: (noteId) =>
  set((state) => {
    const next = new Map(state.noteTagsMap);
    next.delete(noteId);
    return { noteTagsMap: next };
  }),
```

- [ ] **Step 2: Sidebar — 加载和传递 tags 数据**

修改 `packages/web/src/components/desktop/Sidebar.tsx`:

新增 import:

```typescript
import { useNotesStore, useTagsStore, useUIStore } from "../../stores";
```

(已有，确认包含 notesStore 的 noteTagsMap)

新增 store 读取:

```typescript
const noteTagsMap = useNotesStore((s) => s.noteTagsMap);
const setNoteTagsMap = useNotesStore((s) => s.setNoteTagsMap);
```

新增 useStorage 方法:

```typescript
const { getNotesForTag, deleteTag, createNote, deleteNote, updateNote, getTagsForNote } =
  useStorage();
```

新增 useEffect 加载所有笔记的 tags:

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const note of activeNotes) {
      const tags = await getTagsForNote(note.id);
      map.set(note.id, tags);
    }
    if (!cancelled) {
      setNoteTagsMap(map);
    }
  })();
  return () => {
    cancelled = true;
  };
}, [activeNotes, getTagsForNote, setNoteTagsMap]);
```

修改 NoteCard 渲染，将:

```tsx
<NoteCard
  note={note}
  onClick={setCurrentNote}
  onDelete={(n) => setDeleteNoteId(n.id)}
  onMoveToFolder={(n) => { ... }}
  onCopyMarkdown={(n) => ...}
/>
```

追加 tags prop:

```tsx
<NoteCard
  note={note}
  onClick={setCurrentNote}
  tags={noteTagsMap.get(note.id)}
  onDelete={(n) => setDeleteNoteId(n.id)}
  onMoveToFolder={(n) => { ... }}
  onCopyMarkdown={(n) => ...}
/>
```

- [ ] **Step 3: NoteListMobile — 加载和传递 tags 数据**

修改 `packages/web/src/components/mobile/NoteListMobile.tsx`:

新增 store 读取:

```typescript
const noteTagsMap = useNotesStore((s) => s.noteTagsMap);
const setNoteTagsMap = useNotesStore((s) => s.setNoteTagsMap);
```

新增 useStorage 方法 `getTagsForNote`:

```typescript
const {
  listNotes,
  listFolders,
  getNotesForTag,
  createNote,
  deleteNote,
  updateNote,
  getTagsForNote,
} = useStorage();
```

新增 useEffect 加载 tags:

```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const note of activeNotes) {
      const tags = await getTagsForNote(note.id);
      map.set(note.id, tags);
    }
    if (!cancelled) {
      setNoteTagsMap(map);
    }
  })();
  return () => {
    cancelled = true;
  };
}, [activeNotes, getTagsForNote, setNoteTagsMap]);
```

追加 tags prop 到 NoteCard:

```tsx
<NoteCard
  key={note.id}
  note={note}
  onClick={setCurrentNote}
  tags={noteTagsMap.get(note.id)}
  onDelete={(n) => setDeleteNoteId(n.id)}
  onMoveToFolder={(n) => { ... }}
  onCopyMarkdown={(n) => ...}
/>
```

- [ ] **Step 4: NoteCard — 增加 tags overflow 显示**

修改 `packages/web/src/components/shared/NoteCard.tsx`:

新增 import:

```typescript
import * as Tooltip from "@radix-ui/react-tooltip";
```

在日期行（line 61-68）的 `<div className="flex items-center gap-2 mt-1">` 中，将现有的 tags 渲染:

```tsx
{
  tags?.map((tag) => <TagBadge key={tag.id} name={tag.name} />);
}
```

改为 overflow 版本:

```tsx
{
  tags && tags.length > 0 && (
    <div className="flex items-center gap-1 overflow-hidden">
      {tags.slice(0, 2).map((tag) => (
        <TagBadge key={tag.id} name={tag.name} />
      ))}
      {tags.length > 2 && (
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <span
              className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              +{tags.length - 2}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="rounded-md px-3 py-2 text-xs shadow-lg"
              style={{
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
              }}
              sideOffset={4}
            >
              {tags
                .slice(2)
                .map((tag) => tag.name)
                .join(", ")}
              <Tooltip.Arrow style={{ fill: "var(--bg-primary)" }} />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/stores/notesStore.ts packages/web/src/components/shared/NoteCard.tsx packages/web/src/components/desktop/Sidebar.tsx packages/web/src/components/mobile/NoteListMobile.tsx
git commit -m "feat: 笔记卡片显示标签，最多2个+溢出计数tooltip"
```

---

## Task 7: 文件夹管理功能增强

**Files:**

- Modify: `packages/web/src/components/desktop/FolderTreeDropdown.tsx`
- Modify: `packages/web/src/components/desktop/FolderTree.tsx`
- Create: `packages/web/src/components/shared/DeleteFolderDialog.tsx`
- Modify: `packages/web/src/stores/foldersStore.ts`
- Modify: `packages/web/src/hooks/useStorage.ts` (已在 Task 2 完成)
- Modify: `packages/web/src/components/mobile/MobileDrawer.tsx`

- [ ] **Step 1: foldersStore 新增 updateFolderInList action**

修改 `packages/web/src/stores/foldersStore.ts`:

在 `FoldersState` interface 中新增:

```typescript
updateFolderInList: (id: string, partial: Partial<Folder> & { id: string }) => void;
```

在 `create` 函数中新增:

```typescript
updateFolderInList: (id, partial) =>
  set((state) => ({
    folders: state.folders.map((f) => (f.id === id ? { ...f, ...partial } : f)),
  })),
```

- [ ] **Step 2: 创建 DeleteFolderDialog 组件**

创建 `packages/web/src/components/shared/DeleteFolderDialog.tsx`:

```tsx
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  noteCount: number;
  onConfirm: (deleteNotes: boolean) => void;
}

export default function DeleteFolderDialog({
  open,
  onOpenChange,
  folderName,
  noteCount,
  onConfirm,
}: DeleteFolderDialogProps) {
  const [deleteNotes, setDeleteNotes] = useState(false);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-6 shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <AlertDialog.Title className="text-lg font-bold mb-2">
            删除文件夹"{folderName}"
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm mb-3">
            该文件夹下有 {noteCount} 条笔记。删除后，笔记将回到"全部笔记"。
          </AlertDialog.Description>
          <label className="flex items-center gap-2 mb-4 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={deleteNotes}
              onChange={(e) => setDeleteNotes(e.target.checked)}
              className="rounded"
            />
            同时删除文件夹内的所有笔记
          </label>
          {deleteNotes && (
            <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>
              笔记将被移到回收站，可在回收站中恢复。
            </p>
          )}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                className="rounded-md px-3 py-1.5 hover:opacity-80"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                取消
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={() => {
                  onConfirm(deleteNotes);
                  setDeleteNotes(false);
                }}
                className="rounded-md px-3 py-1.5 font-medium text-white bg-red-500 hover:bg-red-600"
              >
                删除
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
```

- [ ] **Step 3: FolderTreeDropdown 增强 — 增加创建/删除/重命名操作**

修改 `packages/web/src/components/desktop/FolderTreeDropdown.tsx`:

替换整个文件为增强版:

```tsx
import { useState, useCallback } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useFoldersStore, useNotesStore } from "../../stores";
import { useStorage } from "../../hooks";
import FolderTree from "./FolderTree";
import DeleteFolderDialog from "../shared/DeleteFolderDialog";

export default function FolderTreeDropdown() {
  const currentFolderId = useFoldersStore((s) => s.currentFolderId);
  const folders = useFoldersStore((s) => s.folders);
  const setCurrentFolderId = useFoldersStore((s) => s.setCurrentFolderId);
  const addFolder = useFoldersStore((s) => s.addFolder);
  const removeFolder = useFoldersStore((s) => s.removeFolder);
  const notes = useNotesStore((s) => s.notes);
  const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
  const {
    createFolder,
    updateFolder,
    deleteFolder,
    listNotes,
    updateNotesFolderId,
    softDeleteNotesByFolder,
  } = useStorage();

  const [open, setOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameMode, setRenameMode] = useState(false);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const currentFolder = folders.find((f) => f.id === currentFolderId);
  const label = currentFolder ? currentFolder.name : "全部笔记";

  const handleSelectFolder = (id: string | null) => {
    setCurrentFolderId(id);
    setOpen(false);
  };

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    const folder = await createFolder({ name: newFolderName.trim(), parentId: currentFolderId });
    addFolder(folder);
    setNewFolderName("");
    setCreateMode(false);
  }, [newFolderName, currentFolderId, createFolder, addFolder]);

  const handleRenameFolder = useCallback(async () => {
    if (!currentFolderId || !renameFolderName.trim()) return;
    const updated = await updateFolder(currentFolderId, { name: renameFolderName.trim() });
    useFoldersStore.getState().updateFolderInList(currentFolderId, updated);
    setRenameFolderName("");
    setRenameMode(false);
  }, [currentFolderId, renameFolderName, updateFolder]);

  const handleConfirmDeleteFolder = useCallback(
    async (deleteNotes: boolean) => {
      if (!deleteFolderId) return;
      if (deleteNotes) {
        await softDeleteNotesByFolder(deleteFolderId);
        const folderNotes = notes.filter(
          (n) => n.folderId === deleteFolderId && n.deletedAt === null,
        );
        for (const note of folderNotes) {
          removeNoteFromList(note.id);
        }
      } else {
        await updateNotesFolderId(deleteFolderId, null);
        const store = useNotesStore.getState();
        const folderNotes = store.notes.filter((n) => n.folderId === deleteFolderId);
        for (const note of folderNotes) {
          store.updateNoteInList(note.id, { id: note.id, folderId: null });
        }
      }
      await deleteFolder(deleteFolderId);
      removeFolder(deleteFolderId);
      if (currentFolderId === deleteFolderId) {
        setCurrentFolderId(null);
      }
      setDeleteFolderId(null);
    },
    [
      deleteFolderId,
      deleteNotes,
      softDeleteNotesByFolder,
      updateNotesFolderId,
      deleteFolder,
      removeFolder,
      removeNoteFromList,
      notes,
      currentFolderId,
    ],
  );

  const deleteNoteCount = deleteFolderId
    ? notes.filter((n) => n.folderId === deleteFolderId && n.deletedAt === null).length
    : 0;

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            {label}
            <span className="text-xs ml-1">▼</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-50 rounded-md p-2 shadow-lg w-64"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
            align="start"
            sideOffset={4}
          >
            <FolderTree onSelectFolder={handleSelectFolder} selectedFolderId={currentFolderId} />

            <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
              {createMode ? (
                <div className="flex items-center gap-1">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="文件夹名称"
                    className="flex-1 px-2 py-1 text-sm rounded border"
                    style={{
                      borderColor: "var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                    }}
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="text-sm px-2 py-1 rounded"
                    style={{ backgroundColor: "var(--accent)", color: "white" }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setCreateMode(false);
                      setNewFolderName("");
                    }}
                    className="text-sm px-2 py-1 rounded"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreateMode(true)}
                  className="text-sm px-2 py-1 rounded hover:opacity-80 w-full text-left"
                  style={{ color: "var(--text-secondary)" }}
                >
                  + 新建文件夹
                </button>
              )}
            </div>

            {currentFolderId && !createMode && (
              <div className="mt-1 pt-1 border-t" style={{ borderColor: "var(--border-color)" }}>
                {renameMode ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={renameFolderName}
                      onChange={(e) => setRenameFolderName(e.target.value)}
                      placeholder={currentFolder?.name ?? ""}
                      className="flex-1 px-2 py-1 text-sm rounded border"
                      style={{
                        borderColor: "var(--border-color)",
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                      }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameFolder();
                      }}
                    />
                    <button
                      onClick={handleRenameFolder}
                      className="text-sm px-2 py-1 rounded"
                      style={{ backgroundColor: "var(--accent)", color: "white" }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setRenameMode(false);
                        setRenameFolderName("");
                      }}
                      className="text-sm px-2 py-1 rounded"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => {
                        setRenameMode(true);
                        setRenameFolderName(currentFolder?.name ?? "");
                      }}
                      className="text-sm px-2 py-1 rounded hover:opacity-80 w-full text-left"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      ✎ 重命名
                    </button>
                    <button
                      onClick={() => setDeleteFolderId(currentFolderId)}
                      className="text-sm px-2 py-1 rounded hover:opacity-80 w-full text-left"
                      style={{ color: "var(--danger)" }}
                    >
                      🗑 删除文件夹
                    </button>
                  </div>
                )}
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <DeleteFolderDialog
        open={deleteFolderId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteFolderId(null);
        }}
        folderName={
          deleteFolderId ? (folders.find((f) => f.id === deleteFolderId)?.name ?? "") : ""
        }
        noteCount={deleteNoteCount}
        onConfirm={handleConfirmDeleteFolder}
      />
    </>
  );
}
```

- [ ] **Step 4: MobileDrawer — 增加文件夹管理操作**

修改 `packages/web/src/components/mobile/MobileDrawer.tsx`:

新增 import:

```typescript
import { useFoldersStore, useNotesStore } from "../../stores";
import DeleteFolderDialog from "../shared/DeleteFolderDialog";
```

在组件内新增 state 和 store:

```typescript
const currentFolderId = useFoldersStore((s) => s.currentFolderId);
const setCurrentFolderId = useFoldersStore((s) => s.setCurrentFolderId);
const addFolder = useFoldersStore((s) => s.addFolder);
const removeFolder = useFoldersStore((s) => s.removeFolder);
const notes = useNotesStore((s) => s.notes);
const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
const {
  getNotesForTag,
  deleteTag,
  createFolder,
  updateFolder,
  deleteFolder,
  updateNotesFolderId,
  softDeleteNotesByFolder,
} = useStorage();

const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
const [createMode, setCreateMode] = useState(false);
const [newFolderName, setNewFolderName] = useState("");
```

在 FolderTree 部分之后（line 87 之后），增加文件夹管理操作区域:

```tsx
<div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
  {createMode ? (
    <div className="flex items-center gap-1">
      <input
        value={newFolderName}
        onChange={(e) => setNewFolderName(e.target.value)}
        placeholder="文件夹名称"
        className="flex-1 px-2 py-1 text-sm rounded border"
        style={{
          borderColor: "var(--border-color)",
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text-primary)",
        }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreateFolderMobile();
        }}
      />
      <button
        onClick={handleCreateFolderMobile}
        className="text-sm px-2 py-1 rounded"
        style={{ backgroundColor: "var(--accent)", color: "white" }}
      >
        ✓
      </button>
      <button
        onClick={() => {
          setCreateMode(false);
          setNewFolderName("");
        }}
        className="text-sm px-2 py-1 rounded"
        style={{ color: "var(--text-secondary)" }}
      >
        ✕
      </button>
    </div>
  ) : (
    <button
      onClick={() => setCreateMode(true)}
      className="text-sm px-2 py-1 rounded w-full text-left"
      style={{ color: "var(--text-secondary)" }}
    >
      + 新建文件夹
    </button>
  )}
</div>
```

新增 handleCreateFolderMobile callback:

```typescript
const handleCreateFolderMobile = useCallback(async () => {
  if (!newFolderName.trim()) return;
  const folder = await createFolder({ name: newFolderName.trim() });
  addFolder(folder);
  setNewFolderName("");
  setCreateMode(false);
}, [newFolderName, createFolder, addFolder]);
```

新增 handleConfirmDeleteFolder callback (与 FolderTreeDropdown 中逻辑相同):

```typescript
const handleConfirmDeleteFolder = useCallback(
  async (deleteNotes: boolean) => {
    if (!deleteFolderId) return;
    if (deleteNotes) {
      await softDeleteNotesByFolder(deleteFolderId);
      const folderNotes = notes.filter(
        (n) => n.folderId === deleteFolderId && n.deletedAt === null,
      );
      for (const note of folderNotes) {
        removeNoteFromList(note.id);
      }
    } else {
      await updateNotesFolderId(deleteFolderId, null);
      const store = useNotesStore.getState();
      const folderNotes = store.notes.filter((n) => n.folderId === deleteFolderId);
      for (const note of folderNotes) {
        store.updateNoteInList(note.id, { id: note.id, folderId: null });
      }
    }
    await deleteFolder(deleteFolderId);
    removeFolder(deleteFolderId);
    if (currentFolderId === deleteFolderId) {
      setCurrentFolderId(null);
    }
    setDeleteFolderId(null);
  },
  [
    deleteFolderId,
    softDeleteNotesByFolder,
    updateNotesFolderId,
    deleteFolder,
    removeFolder,
    removeNoteFromList,
    notes,
    currentFolderId,
  ],
);
```

在组件 JSX 末尾增加 DeleteFolderDialog:

```tsx
<DeleteFolderDialog
  open={deleteFolderId !== null}
  onOpenChange={(open) => {
    if (!open) setDeleteFolderId(null);
  }}
  folderName={
    deleteFolderId
      ? (useFoldersStore.getState().folders.find((f) => f.id === deleteFolderId)?.name ?? "")
      : ""
  }
  noteCount={
    deleteFolderId
      ? notes.filter((n) => n.folderId === deleteFolderId && n.deletedAt === null).length
      : 0
  }
  onConfirm={handleConfirmDeleteFolder}
/>
```

注意：MobileDrawer 当前在 `FolderTree` 组件中没有删除操作入口。需要在 `FolderTree` 组件或 MobileDrawer 中增加文件夹的右键/长按删除能力。由于 FolderTree 是共享组件（桌面和移动端都用），最简单的方式是在 FolderTree 的 TreeNode 中增加一个删除按钮（仅当传入了 `onDeleteFolder` prop 时显示）。

- [ ] **Step 5: FolderTree — 增加可选的 onDeleteFolder prop**

修改 `packages/web/src/components/desktop/FolderTree.tsx`:

在 `FolderTreeProps` interface 中新增:

```typescript
onDeleteFolder?: (id: string) => void;
```

在 TreeNode 的 props 中新增 `onDeleteFolder` 并传递下去。

在 TreeNode 渲染中，在文件夹名称后面增加删除按钮:

```tsx
<span
  data-folder-id={node.folder.id}
  onClick={() => onSelectFolder(node.folder.id)}
  className={`text-sm px-2 py-1 rounded hover:bg-[var(--hover-bg)] cursor-pointer ${
    isSelected ? "bg-[rgba(59,130,246,0.1)] text-[var(--accent)]" : ""
  }`}
>
  {node.folder.name}
</span>;
{
  onDeleteFolder && (
    <button
      onClick={() => onDeleteFolder(node.folder.id)}
      className="text-xs ml-1 hover:opacity-80"
      style={{ color: "var(--danger)" }}
      aria-label={`删除文件夹 ${node.folder.name}`}
    >
      🗑
    </button>
  );
}
```

在 FolderTree 主组件中，将 `onDeleteFolder` 传递给每个 TreeNode:

```tsx
{
  tree.map((node) => (
    <TreeNode
      key={node.folder.id}
      node={node}
      onSelectFolder={onSelectFolder}
      selectedFolderId={selectedFolderId}
      expandedIds={expandedIds}
      setExpandedIds={setExpandedIds}
      onDeleteFolder={onDeleteFolder}
    />
  ));
}
```

在 MobileDrawer 中，FolderTree 组件传入 onDeleteFolder:

```tsx
<FolderTree
  onSelectFolder={handleSelectFolder}
  selectedFolderId={currentFolderId}
  onDeleteFolder={(id) => setDeleteFolderId(id)}
/>
```

在 FolderTreeDropdown 中，FolderTree 不传入 onDeleteFolder（因为下拉框内已有删除按钮），保持 `onDeleteFolder` 不传。

- [ ] **Step 6: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 7: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 8: 运行 core 单元测试（验证批量方法）**

Run: `pnpm --filter @notes/core test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/components/shared/DeleteFolderDialog.tsx packages/web/src/components/desktop/FolderTreeDropdown.tsx packages/web/src/components/desktop/FolderTree.tsx packages/web/src/stores/foldersStore.ts packages/web/src/components/mobile/MobileDrawer.tsx
git commit -m "feat: 文件夹管理增强 — 创建/删除/重命名，删除含复选框"
```

---

## Task 8: 最终验证

- [ ] **Step 1: 运行完整 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 2: 运行完整 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 3: 运行 format:check**

Run: `pnpm format:check`
Expected: PASS

- [ ] **Step 4: 运行 core 单元测试**

Run: `pnpm --filter @notes/core test`
Expected: PASS

- [ ] **Step 5: 运行 web 单元测试**

Run: `pnpm --filter @notes/web test`
Expected: PASS

- [ ] **Step 6: 手动启动 dev server 验证 UI**

Run: `pnpm dev`

在浏览器打开 http://localhost:3000，逐项验证：

1. 侧栏笔记卡片：空标题笔记显示内容首行（淡色斜体），有标题笔记正常显示
2. 侧栏顶部"新建"按钮：点击创建新笔记并自动选中
3. 笔记卡片 hover 显示"⋯"菜单：可删除笔记、移动到文件夹、复制 Markdown
4. 笔记卡片标签显示：最多 2 个标签 + "+N" overflow tooltip
5. 文件夹下拉框：可创建、重命名、删除文件夹
6. 删除文件夹：弹出确认对话框，复选框控制是否同时删除笔记
