# 标签功能重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复标签创建/选择/删除的 bug，改为搜索框内直接创建，新增标签全局删除（带确认对话框），修复侧边栏筛选逻辑。

**Architecture:** 在 core StorageAdapter 接口新增 `deleteTag` 和 `getNotesForTag` 方法，在两个存储实现中同步实现。Web 层面：TagSelector 改为搜索框内直接创建（去掉 TagCreateDialog），NoteView 修复标签持久化 bug，新增 DeleteTagDialog 组件，Sidebar/移动端修复筛选 + 增加删除按钮。

**Tech Stack:** React 18, Zustand, Radix UI Dialog, wa-sqlite, pnpm monorepo

---

## Task 1: StorageAdapter 接口新增 deleteTag 和 getNotesForTag

**Files:**

- Modify: `packages/core/src/storage/adapter.ts:39-46`
- Modify: `packages/core/src/storage/web-adapter.ts:293-344`
- Modify: `packages/web/src/lib/sqlite-shared-worker.ts:609-659`

- [ ] **Step 1: 在 StorageAdapter 接口新增两个方法**

在 `packages/core/src/storage/adapter.ts` 的接口中，在 `listTags()` 之后新增：

```typescript
deleteTag(id: string): Promise<void>;
getNotesForTag(tagId: string): Promise<Note[]>;
```

- [ ] **Step 2: 在 WebStorageAdapter 中实现 deleteTag 和 getNotesForTag**

在 `packages/core/src/storage/web-adapter.ts` 的 `listTags()` 方法后新增：

```typescript
async deleteTag(id: string): Promise<void> {
  const db = this.getDB();
  await runSQL(db, `DELETE FROM note_tags WHERE tag_id=?`, [id]);
  await runSQL(db, `DELETE FROM tags WHERE id=?`, [id]);
}

async getNotesForTag(tagId: string): Promise<Note[]> {
  const db = this.getDB();
  const rows = await querySQL<Row>(
    db,
    `SELECT notes.* FROM notes INNER JOIN note_tags ON notes.id=note_tags.note_id WHERE note_tags.tag_id=? AND notes.deleted_at IS NULL`,
    [tagId],
  );
  return rows.map(mapNoteRow);
}
```

- [ ] **Step 3: 在 SharedWorkerStorageAdapter 中实现 deleteTag 和 getNotesForTag**

在 `packages/web/src/lib/sqlite-shared-worker.ts` 的 `listTags()` 方法后新增：

```typescript
async deleteTag(id: string): Promise<void> {
  await this.client.run(`DELETE FROM note_tags WHERE tag_id=?`, [id]);
  await this.client.run(`DELETE FROM tags WHERE id=?`, [id]);
}

async getNotesForTag(tagId: string): Promise<Note[]> {
  const rows = await this.client.query<Row>(
    `SELECT notes.* FROM notes INNER JOIN note_tags ON notes.id=note_tags.note_id WHERE note_tags.tag_id=? AND notes.deleted_at IS NULL`,
    [tagId],
  );
  return rows.map(mapNoteRow);
}
```

- [ ] **Step 4: 确保 core models barrel 导出包含 Note 类型**

确认 `packages/core/src/models/index.ts` 导出了 `Note`，`packages/core/src/index.ts` 导出了 models。如果已有则无需修改。

- [ ] **Step 5: 运行 typecheck 验证**

Run: `pnpm typecheck`
Expected: PASS（两个包均无类型错误）

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/storage/adapter.ts packages/core/src/storage/web-adapter.ts packages/web/src/lib/sqlite-shared-worker.ts
git commit -m "feat: add deleteTag and getNotesForTag to StorageAdapter"
```

---

## Task 2: useStorage hook 暴露新方法 + tagsStore 增加 deleteTag

**Files:**

- Modify: `packages/web/src/hooks/useStorage.ts:43-71`
- Modify: `packages/web/src/stores/tagsStore.ts:1-20`

- [ ] **Step 1: 在 useStorage hook 中新增方法**

在 `packages/web/src/hooks/useStorage.ts` 中，`listTags` 之后新增以下方法，并在 return 对象中暴露：

```typescript
const removeTagFromNote = useCallback(async (noteId: string, tagId: string): Promise<void> => {
  return getStorage().removeTagFromNote(noteId, tagId);
}, []);

const removeTagsFromNote = useCallback(async (noteId: string, tagIds: string[]): Promise<void> => {
  return getStorage().removeTagsFromNote(noteId, tagIds);
}, []);

const deleteTag = useCallback(async (id: string): Promise<void> => {
  return getStorage().deleteTag(id);
}, []);

const getNotesForTag = useCallback(async (tagId: string): Promise<Note[]> => {
  return getStorage().getNotesForTag(tagId);
}, []);
```

return 对象增加：`removeTagFromNote`, `removeTagsFromNote`, `deleteTag`, `getNotesForTag`

- [ ] **Step 2: 在 tagsStore 中增加 deleteTag action**

在 `packages/web/src/stores/tagsStore.ts` 的 `TagsState` 接口中新增：

```typescript
deleteTag: (id: string) => void;
```

在 `create<TagsState>` 实现中新增：

```typescript
deleteTag: (id) => set((state) => ({ tags: state.tags.filter((t) => t.id !== id) })),
```

- [ ] **Step 3: 运行 typecheck 验证**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/hooks/useStorage.ts packages/web/src/stores/tagsStore.ts
git commit -m "feat: expose tag removal/deletion methods in useStorage and tagsStore"
```

---

## Task 3: 重写 TagSelector — 搜索框内直接创建

**Files:**

- Modify: `packages/web/src/components/shared/TagSelector.tsx` (重写整个文件)
- Delete: `packages/web/src/components/shared/TagCreateDialog.tsx`

- [ ] **Step 1: 重写 TagSelector.tsx**

将 `packages/web/src/components/shared/TagSelector.tsx` 替换为：

```tsx
import { useState } from "react";
import { useTagsStore } from "../../stores/tagsStore";

interface TagSelectorProps {
  selectedTagIds: string[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreateTag: (name: string) => void;
}

export default function TagSelector({
  selectedTagIds,
  onAdd,
  onRemove,
  onCreateTag,
}: TagSelectorProps) {
  const tags = useTagsStore((s) => s.tags);
  const [search, setSearch] = useState("");

  const searchTrimmed = search.trim();
  const lowerSearch = searchTrimmed.toLowerCase();
  const filteredTags = tags.filter((t) => t.name.toLowerCase().includes(lowerSearch));
  const exactMatch = tags.some((t) => t.name.toLowerCase() === lowerSearch && searchTrimmed !== "");
  const canCreate = searchTrimmed !== "" && !exactMatch;

  const handleClick = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onRemove(tagId);
    } else {
      onAdd(tagId);
    }
  };

  const handleCreate = () => {
    onCreateTag(searchTrimmed);
    setSearch("");
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 rounded-lg"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canCreate) handleCreate();
        }}
        placeholder="搜索或创建标签..."
        className="w-full rounded-md border px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          borderColor: "var(--border-color)",
        }}
      />
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {filteredTags.map((tag) => (
          <div
            key={tag.id}
            onClick={() => handleClick(tag.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer hover:opacity-80 ${
              selectedTagIds.includes(tag.id) ? "bg-blue-500 text-white" : ""
            }`}
            style={
              !selectedTagIds.includes(tag.id)
                ? { backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }
                : undefined
            }
          >
            {selectedTagIds.includes(tag.id) && <span className="text-sm">✓</span>}
            <span>{tag.name}</span>
          </div>
        ))}
        {canCreate && (
          <div
            onClick={handleCreate}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer hover:opacity-80 text-blue-500"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            <span className="text-sm">+</span>
            <span>创建 '{searchTrimmed}'</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 删除 TagCreateDialog.tsx**

删除文件 `packages/web/src/components/shared/TagCreateDialog.tsx`

- [ ] **Step 3: 运行 typecheck 验证**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/shared/TagSelector.tsx
git rm packages/web/src/components/shared/TagCreateDialog.tsx
git commit -m "feat: inline tag creation in TagSelector, remove TagCreateDialog"
```

---

## Task 4: 修复 NoteView 标签交互 bug

**Files:**

- Modify: `packages/web/src/components/NoteView.tsx:29,89-116`

- [ ] **Step 1: 修改 NoteView — 从 useStorage 获取新方法**

在 `packages/web/src/components/NoteView.tsx` 第 29 行，将：

```tsx
const { updateNote, addTagsToNote, createTag } = useStorage();
```

改为：

```tsx
const { updateNote, addTagsToNote, removeTagFromNote, createTag } = useStorage();
```

同时从 `useTagsStore` 获取 `addTag`：

```tsx
const tags = useTagsStore((s) => s.tags);
const addTagToStore = useTagsStore((s) => s.addTag);
```

- [ ] **Step 2: 修复 handleAddTag — 取消选中时调用 removeTagFromNote**

将 `handleAddTag` (第 89-101 行) 替换为：

```tsx
const handleAddTag = useCallback(
  async (tagId: string) => {
    if (noteTagIds.includes(tagId)) {
      setNoteTagIds((prev) => prev.filter((id) => id !== tagId));
      try {
        await removeTagFromNote(noteIdRef.current, tagId);
      } catch {}
    } else {
      setNoteTagIds((prev) => [...prev, tagId]);
      try {
        await addTagsToNote(noteIdRef.current, [tagId]);
      } catch {}
    }
  },
  [noteTagIds, addTagsToNote, removeTagFromNote],
);
```

- [ ] **Step 3: 修复 handleRemoveTag — 增加 API 持久化**

将 `handleRemoveTag` (第 103-105 行) 替换为：

```tsx
const handleRemoveTag = useCallback(
  async (tagId: string) => {
    setNoteTagIds((prev) => prev.filter((id) => id !== tagId));
    try {
      await removeTagFromNote(noteIdRef.current, tagId);
    } catch {}
  },
  [removeTagFromNote],
);
```

- [ ] **Step 4: 修复 handleCreateTag — 同步到 tagsStore**

将 `handleCreateTag` (第 107-116 行) 替换为：

```tsx
const handleCreateTag = useCallback(
  async (name: string) => {
    const tag = await createTag(name);
    addTagToStore(tag);
    setNoteTagIds((prev) => [...prev, tag.id]);
    try {
      await addTagsToNote(noteIdRef.current, [tag.id]);
    } catch {}
  },
  [addTagsToNote, createTag, addTagToStore],
);
```

- [ ] **Step 5: 运行 typecheck + 相关测试验证**

Run: `pnpm typecheck && pnpm --filter @notes/web test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/NoteView.tsx
git commit -m "fix: persist tag removal in NoteView, sync new tags to store"
```

---

## Task 5: 新建 DeleteTagDialog 组件

**Files:**

- Create: `packages/web/src/components/shared/DeleteTagDialog.tsx`

- [ ] **Step 1: 创建 DeleteTagDialog.tsx**

创建 `packages/web/src/components/shared/DeleteTagDialog.tsx`：

```tsx
import * as Dialog from "@radix-ui/react-dialog";
import type { Note } from "@notes/core";

interface DeleteTagDialogProps {
  open: boolean;
  onClose: () => void;
  tagName: string;
  affectedNotes: Note[];
  onConfirm: () => void;
}

export default function DeleteTagDialog({
  open,
  onClose,
  tagName,
  affectedNotes,
  onConfirm,
}: DeleteTagDialogProps) {
  const MAX_DISPLAY = 10;
  const displayedNotes = affectedNotes.slice(0, MAX_DISPLAY);
  const remaining = affectedNotes.length - MAX_DISPLAY;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-6 shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">删除标签 '{tagName}'</Dialog.Title>
          {affectedNotes.length > 0 && (
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                以下笔记将失去此标签：
              </p>
              <ul className="text-sm space-y-1">
                {displayedNotes.map((note) => (
                  <li key={note.id} className="truncate">
                    {note.title}
                  </li>
                ))}
                {remaining > 0 && (
                  <li style={{ color: "var(--text-secondary)" }}>...等 {remaining} 个笔记</li>
                )}
              </ul>
            </div>
          )}
          {affectedNotes.length === 0 && (
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              没有笔记使用此标签。
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                className="rounded-md px-3 py-1.5 hover:opacity-80"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                取消
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              className="rounded-md px-3 py-1.5 font-medium text-white bg-red-500 hover:bg-red-600"
            >
              确认删除
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: 运行 typecheck 验证**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/shared/DeleteTagDialog.tsx
git commit -m "feat: add DeleteTagDialog component"
```

---

## Task 6: Sidebar 增加标签删除按钮 + 修复筛选

**Files:**

- Modify: `packages/web/src/components/desktop/Sidebar.tsx`

- [ ] **Step 1: 重写 Sidebar 标签区域**

将 `packages/web/src/components/desktop/Sidebar.tsx` 整体修改。主要改动：

1. 导入新依赖：`useStorage`, `DeleteTagDialog`, `Note`
2. 新增 `deleteTagId` 和 `affectedNotes` 状态
3. 修复 `filteredNotes` 筛选逻辑（用 `getNotesForTag` 获取关联笔记 ID，取交集）
4. 标签按钮旁加 × 删除按钮
5. DeleteTagDialog 集成

完整替换文件为：

```tsx
import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNotesStore, useTagsStore, useUIStore } from "../../stores";
import { useSearch, useStorage } from "../../hooks";
import FolderTreeDropdown from "./FolderTreeDropdown";
import SearchBar from "../shared/SearchBar";
import ThemeToggle from "../shared/ThemeToggle";
import NoteCard from "../shared/NoteCard";
import DeleteTagDialog from "../shared/DeleteTagDialog";
import type { Note } from "@notes/core";

export default function Sidebar() {
  const notes = useNotesStore((s) => s.notes);
  const setCurrentNote = useNotesStore((s) => s.setCurrentNote);
  const tags = useTagsStore((s) => s.tags);
  const deleteTagFromStore = useTagsStore((s) => s.deleteTag);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const { getNotesForTag, deleteTag } = useStorage();

  const { searchInput, updateFilter, clearSearch } = useSearch();
  const [showFilter, setShowFilter] = useState(false);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [affectedNotes, setAffectedNotes] = useState<Note[]>([]);

  const parentRef = useRef<HTMLDivElement>(null);

  const activeNotes = useMemo(() => notes.filter((n) => n.deletedAt === null), [notes]);

  const filteredNotes = useMemo(() => {
    if (activeTagIds.length === 0) return activeNotes;
    return activeNotes.filter((n) => activeTagIds.includes(n.id));
  }, [activeNotes, activeTagIds]);

  const [tagFilteredNoteIds, setTagFilteredNoteIds] = useState<string[]>([]);

  useEffect(() => {
    if (activeTagIds.length === 0) {
      setTagFilteredNoteIds(activeNotes.map((n) => n.id));
      return;
    }
    let cancelled = false;
    (async () => {
      const idSets: Set<string>[] = [];
      for (const tagId of activeTagIds) {
        const tagNotes = await getNotesForTag(tagId);
        idSets.push(new Set(tagNotes.map((n) => n.id)));
      }
      if (cancelled) return;
      const intersection = idSets.reduce(
        (acc, set) => new Set([...acc].filter((id) => set.has(id))),
        idSets[0],
      );
      setTagFilteredNoteIds([...intersection]);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTagIds, activeNotes, getNotesForTag]);

  const finalNotes = useMemo(() => {
    if (activeTagIds.length === 0) return activeNotes;
    return activeNotes.filter((n) => tagFilteredNoteIds.includes(n.id));
  }, [activeNotes, activeTagIds, tagFilteredNoteIds]);

  const virtualizer = useVirtualizer({
    count: finalNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  const handleTagClick = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleDeleteTagClick = useCallback(
    async (tagId: string) => {
      const tagNotes = await getNotesForTag(tagId);
      setAffectedNotes(tagNotes);
      setDeleteTagId(tagId);
    },
    [getNotesForTag],
  );

  const handleConfirmDeleteTag = useCallback(async () => {
    if (!deleteTagId) return;
    await deleteTag(deleteTagId);
    deleteTagFromStore(deleteTagId);
    setActiveTagIds((prev) => prev.filter((id) => id !== deleteTagId));
    setDeleteTagId(null);
    setAffectedNotes([]);
  }, [deleteTagId, deleteTag, deleteTagFromStore]);

  const deletingTagName = deleteTagId ? (tags.find((t) => t.id === deleteTagId)?.name ?? "") : "";

  const sidebarWidth = sidebarOpen ? "320px" : "0px";

  return (
    <div
      data-testid="sidebar"
      className="h-full flex flex-col overflow-hidden border-r transition-all duration-300"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="p-3 space-y-2 border-b" style={{ borderColor: "var(--border-color)" }}>
        <FolderTreeDropdown />
        <SearchBar
          query={searchInput.query || ""}
          onQueryChange={(q) => updateFilter({ query: q })}
          showFilter={showFilter}
          onToggleFilter={() => setShowFilter(!showFilter)}
        />
      </div>

      <div className="px-3 py-2 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-0.5">
            <button
              onClick={() => handleTagClick(tag.id)}
              className={`px-2 py-1 rounded-md text-xs ${
                activeTagIds.includes(tag.id) ? "bg-blue-500 text-white" : ""
              }`}
              style={
                !activeTagIds.includes(tag.id)
                  ? { backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }
                  : undefined
              }
            >
              {tag.name}
            </button>
            <button
              onClick={() => handleDeleteTagClick(tag.id)}
              className="px-1 py-0.5 text-xs rounded hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
              aria-label={`删除标签 ${tag.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto px-2">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const note = finalNotes[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <NoteCard note={note} onClick={setCurrentNote} />
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="flex items-center justify-between p-3 border-t"
        style={{ borderColor: "var(--border-color)" }}
      >
        <ThemeToggle />
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="收起侧栏"
          className="px-2 py-1 rounded text-sm hover:opacity-80"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
        >
          收起 ←
        </button>
      </div>

      <DeleteTagDialog
        open={deleteTagId !== null}
        onClose={() => {
          setDeleteTagId(null);
          setAffectedNotes([]);
        }}
        tagName={deletingTagName}
        affectedNotes={affectedNotes}
        onConfirm={handleConfirmDeleteTag}
      />
    </div>
  );
}
```

- [ ] **Step 2: 运行 typecheck 验证**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/desktop/Sidebar.tsx
git commit -m "feat: add tag delete button to Sidebar, fix tag filtering logic"
```

---

## Task 7: MobileDrawer 增加标签删除 + 筛选状态

**Files:**

- Modify: `packages/web/src/components/mobile/MobileDrawer.tsx`

- [ ] **Step 1: 重写 MobileDrawer 标签区域**

将 `packages/web/src/components/mobile/MobileDrawer.tsx` 替换为：

```tsx
import * as Dialog from "@radix-ui/react-dialog";
import FolderTree from "../desktop/FolderTree";
import { useTagsStore, useFoldersStore } from "../../stores";
import { useStorage } from "../../hooks";
import DeleteTagDialog from "../shared/DeleteTagDialog";
import type { Note } from "@notes/core";
import { useState, useCallback } from "react";

interface MobileDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigate?: () => void;
  onTagSelect?: (tagId: string) => void;
}

export default function MobileDrawer({
  open,
  onOpenChange,
  onNavigate,
  onTagSelect,
}: MobileDrawerProps) {
  const tags = useTagsStore((s) => s.tags);
  const deleteTagFromStore = useTagsStore((s) => s.deleteTag);
  const setCurrentFolderId = useFoldersStore((s) => s.setCurrentFolderId);
  const { getNotesForTag, deleteTag } = useStorage();

  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [affectedNotes, setAffectedNotes] = useState<Note[]>([]);

  const handleSelectFolder = (id: string | null) => {
    setCurrentFolderId(id);
    onNavigate?.();
    onOpenChange?.(false);
  };

  const handleDeleteTagClick = useCallback(
    async (tagId: string) => {
      const tagNotes = await getNotesForTag(tagId);
      setAffectedNotes(tagNotes);
      setDeleteTagId(tagId);
    },
    [getNotesForTag],
  );

  const handleConfirmDeleteTag = useCallback(async () => {
    if (!deleteTagId) return;
    await deleteTag(deleteTagId);
    deleteTagFromStore(deleteTagId);
    setDeleteTagId(null);
    setAffectedNotes([]);
  }, [deleteTagId, deleteTag, deleteTagFromStore]);

  const deletingTagName = deleteTagId ? (tags.find((t) => t.id === deleteTagId)?.name ?? "") : "";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          aria-label="打开导航"
          className="p-2 rounded-md hover:opacity-80"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
        >
          ☰
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          className="fixed left-0 top-0 bottom-0 w-72 z-50 p-4 overflow-auto"
          style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">导航</Dialog.Title>
          <Dialog.Close asChild>
            <button
              aria-label="关闭"
              className="absolute top-3 right-3 p-2 rounded-md hover:opacity-80"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              ✕
            </button>
          </Dialog.Close>

          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              文件夹
            </h3>
            <FolderTree onSelectFolder={handleSelectFolder} selectedFolderId={null} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      onTagSelect?.(tag.id);
                      onNavigate?.();
                      onOpenChange?.(false);
                    }}
                    className="px-2 py-1 rounded-md text-xs"
                    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                  >
                    #{tag.name}
                  </button>
                  <button
                    onClick={() => handleDeleteTagClick(tag.id)}
                    className="px-1 text-xs rounded hover:opacity-80"
                    style={{ color: "var(--text-secondary)" }}
                    aria-label={`删除标签 ${tag.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <DeleteTagDialog
        open={deleteTagId !== null}
        onClose={() => {
          setDeleteTagId(null);
          setAffectedNotes([]);
        }}
        tagName={deletingTagName}
        affectedNotes={affectedNotes}
        onConfirm={handleConfirmDeleteTag}
      />
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: 运行 typecheck 验证**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/mobile/MobileDrawer.tsx
git commit -m "feat: add tag delete and select to MobileDrawer"
```

---

## Task 8: NoteListMobile 修复标签筛选

**Files:**

- Modify: `packages/web/src/components/mobile/NoteListMobile.tsx`

- [ ] **Step 1: 修复 NoteListMobile 标签筛选 + 传递 onTagSelect 给 MobileDrawer**

将 `packages/web/src/components/mobile/NoteListMobile.tsx` 替换为：

```tsx
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useStorage } from "../../hooks";
import { useNotesStore, useFoldersStore, useTagsStore } from "../../stores";
import NoteCard from "../shared/NoteCard";
import TagBadge from "../shared/TagBadge";
import { useVirtualizer } from "@tanstack/react-virtual";
import MobileDrawer from "./MobileDrawer";
import type { Note } from "@notes/core";

export default function NoteListMobile() {
  const { listNotes, listFolders, getNotesForTag } = useStorage();
  const { notes, setNotes, setCurrentNote } = useNotesStore();
  const { folders, setFolders } = useFoldersStore();
  const tags = useTagsStore((s) => s.tags);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagFilteredNoteIds, setTagFilteredNoteIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    listNotes()
      .then(setNotes)
      .catch(() => {});
    listFolders()
      .then(setFolders)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTagId) {
      setTagFilteredNoteIds(new Set());
      return;
    }
    let cancelled = false;
    getNotesForTag(selectedTagId)
      .then((tagNotes) => {
        if (!cancelled) {
          setTagFilteredNoteIds(new Set(tagNotes.map((n) => n.id)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedTagId, getNotesForTag]);

  const activeNotes = useMemo(() => {
    const base = notes.filter((n) => n.deletedAt === null);
    if (!selectedTagId || tagFilteredNoteIds.size === 0) return base;
    return base.filter((n) => tagFilteredNoteIds.has(n.id));
  }, [notes, selectedTagId, tagFilteredNoteIds]);

  const handleTagFilter = useCallback(
    (tagId: string) => {
      setSelectedTagId(selectedTagId === tagId ? null : tagId);
    },
    [selectedTagId],
  );

  const handleTagSelectFromDrawer = useCallback((tagId: string) => {
    setSelectedTagId(tagId);
  }, []);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: activeNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          ← 全部笔记
        </h2>
      </div>

      <div
        className="flex items-center gap-1 px-3 py-2 overflow-x-auto border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        {tags.map((tag) => (
          <TagBadge key={tag.id} name={tag.name} onClick={() => handleTagFilter(tag.id)} />
        ))}
      </div>

      <div className="flex items-center px-3 py-1">
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-sm px-2 py-1 rounded-md"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          📁 文件夹
        </button>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onTagSelect={handleTagSelectFromDrawer}
      />

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const note = activeNotes[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <NoteCard key={note.id} note={note} onClick={setCurrentNote} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 运行 typecheck + test 验证**

Run: `pnpm typecheck && pnpm --filter @notes/web test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/mobile/NoteListMobile.tsx
git commit -m "fix: implement actual tag filtering in NoteListMobile"
```

---

## Task 9: QuickNote 修复标签筛选

**Files:**

- Modify: `packages/web/src/components/QuickNote.tsx:68-70,138`

- [ ] **Step 1: 修复 QuickNote 标签筛选逻辑**

在 `packages/web/src/components/QuickNote.tsx` 中：

1. 导入 `Note` 类型和 `useMemo`
2. 将 `useStorage` 增加获取 `getNotesForTag`
3. 新增 `tagFilteredNoteIds` 状态和 `useEffect`
4. 修复 `filteredNotes` 逻辑
5. 修复 `tags.filter((t) => true)` 为实际关联标签

具体改动：

第 1 行导入增加：`useMemo`
第 10 行改为：

```tsx
const { createNote, updateNote, listNotes, listTags, getNotesForTag } = useStorage();
```

第 17 行后新增状态：

```tsx
const [tagFilteredNoteIds, setTagFilteredNoteIds] = useState<Set<string>>(new Set());
```

第 28 行后新增 useEffect：

```tsx
useEffect(() => {
  if (!selectedTagId) {
    setTagFilteredNoteIds(new Set());
    return;
  }
  let cancelled = false;
  getNotesForTag(selectedTagId)
    .then((tagNotes) => {
      if (!cancelled) {
        setTagFilteredNoteIds(new Set(tagNotes.map((n: Note) => n.id)));
      }
    })
    .catch(() => {});
  return () => {
    cancelled = true;
  };
}, [selectedTagId, getNotesForTag]);
```

将第 68-70 行的 `filteredNotes` 替换为：

```tsx
const filteredNotes = useMemo(() => {
  const base = notes.filter((n) => n.deletedAt === null);
  if (!selectedTagId || tagFilteredNoteIds.size === 0) return base;
  return base.filter((n) => tagFilteredNoteIds.has(n.id));
}, [notes, selectedTagId, tagFilteredNoteIds]);
```

将第 138 行 `tags={tags.filter((t) => true)}` 改为 `tags={tags}`（暂时无法精确获取每条笔记的标签，保持展示所有标签即可，后续可优化）。

- [ ] **Step 2: 运行 typecheck + test 验证**

Run: `pnpm typecheck && pnpm --filter @notes/web test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/QuickNote.tsx
git commit -m "fix: implement actual tag filtering in QuickNote"
```

---

## Task 10: 最终验证 — typecheck + lint + test 全量运行

- [ ] **Step 1: 运行完整检查**

Run: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test`

Expected: 全部 PASS

- [ ] **Step 2: 如有 lint/format 问题，修复并重跑**

Run: `pnpm format && pnpm lint`

- [ ] **Step 3: 确认所有改动已完成**

检查 git diff 确认改动符合设计文档要求。
