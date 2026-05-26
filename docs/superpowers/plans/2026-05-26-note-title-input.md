# 笔记标题独立编辑功能 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将笔记标题从"自动从内容提取"改为"用户独立输入编辑"，在编辑器顶部添加内嵌标题输入框。

**Architecture:** 新增 `NoteTitleInput` 组件（styled `<input>`）替换 NoteView 中的只读 `<h2>`。移除所有 `extractTitleFromContent` 自动提取调用。删除右键菜单重命名入口和 RenameDialog 组件。新建笔记时标题为空字符串，空标题在列表中显示为"未命名笔记"。

**Tech Stack:** React 18, Zustand, TypeScript, Tailwind CSS, CSS 变量主题系统

---

## 文件变更清单

| 文件                                                    | 操作 | 职责                                                                   |
| ------------------------------------------------------- | ---- | ---------------------------------------------------------------------- |
| `packages/web/src/components/shared/NoteTitleInput.tsx` | 新增 | 内嵌标题输入框组件                                                     |
| `packages/web/src/components/NoteView.tsx`              | 修改 | 替换 `<h2>` → `<NoteTitleInput>`，移除自动提取，添加 debounce 标题保存 |
| `packages/web/src/components/shared/ContextMenu.tsx`    | 修改 | 删除"重命名"菜单项和 RenameDialog 引用                                 |
| `packages/web/src/components/shared/RenameDialog.tsx`   | 删除 | 空壳组件，不再需要                                                     |
| `packages/web/src/components/QuickNote.tsx`             | 修改 | 创建笔记用空标题，移除 `extractTitleFromContent`                       |
| `packages/web/src/components/layouts/MobileLayout.tsx`  | 修改 | 创建笔记用空标题                                                       |
| `packages/web/src/components/shared/NoteCard.tsx`       | 修改 | 空 title 显示"未命名笔记"                                              |
| `packages/web/src/components/NoteView.tsx` (同一文件)   | 修改 | 移除 `onRename` prop 和 `handleContextMenuRename`                      |

---

### Task 1: 创建 NoteTitleInput 组件

**Files:**

- Create: `packages/web/src/components/shared/NoteTitleInput.tsx`

- [ ] **Step 1: 写组件代码**

```tsx
import { useState, useRef, useCallback, useEffect } from "react";

interface NoteTitleInputProps {
  value: string;
  onChange: (title: string) => void;
  placeholder?: string;
  editorRef?: React.RefObject<any>;
}

export default function NoteTitleInput({
  value,
  onChange,
  placeholder = "输入标题...",
  editorRef,
}: NoteTitleInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, 300);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          onChange(localValue);
        }
        const editorEl = editorRef?.current;
        if (editorEl) {
          editorEl.focus();
        } else {
          const proseMirrorEl = document.querySelector(".ProseMirror");
          if (proseMirrorEl) (proseMirrorEl as HTMLElement).focus();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLocalValue(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        inputRef.current?.blur();
      }
    },
    [localValue, value, onChange, editorRef],
  );

  return (
    <input
      ref={inputRef}
      type="text"
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="w-full text-lg font-semibold bg-transparent border-none outline-none truncate"
      style={{
        color: "var(--text-primary)",
        caretColor: "var(--text-primary)",
        borderBottom:
          inputRef.current === document.activeElement
            ? "1px solid var(--accent)"
            : "1px solid transparent",
        transition: "border-bottom 0.15s ease",
      }}
    />
  );
}
```

注意：上述 `inputRef.current === document.activeElement` 判断方式在 React 渲染时不太可靠。改为使用 CSS `:focus` 伪类来控制聚焦样式，用 CSS 变量。

重写组件：

```tsx
import { useState, useRef, useCallback, useEffect } from "react";

interface NoteTitleInputProps {
  value: string;
  onChange: (title: string) => void;
  placeholder?: string;
  editorRef?: React.RefObject<any>;
}

export default function NoteTitleInput({
  value,
  onChange,
  placeholder = "输入标题...",
  editorRef,
}: NoteTitleInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, 300);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          onChange(localValue);
        }
        const proseMirrorEl = document.querySelector(".ProseMirror");
        if (proseMirrorEl) (proseMirrorEl as HTMLElement).focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLocalValue(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        e.currentTarget.blur();
      }
    },
    [localValue, value, onChange],
  );

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="note-title-input"
      style={{
        color: "var(--text-primary)",
        caretColor: "var(--text-primary)",
      }}
    />
  );
}
```

- [ ] **Step 2: 添加 CSS 样式到 globals.css**

在 `packages/web/src/styles/globals.css` 中添加 `.note-title-input` 样式类。先读取 globals.css 确认位置，然后在合适位置添加：

```css
.note-title-input {
  width: 100%;
  font-size: 1.125rem;
  font-weight: 600;
  background: transparent;
  border: none;
  outline: none;
  border-bottom: 1px solid transparent;
  transition: border-bottom 0.15s ease;
}
.note-title-input:focus {
  border-bottom: 1px solid var(--accent);
}
.note-title-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}
```

---

### Task 2: 修改 NoteView — 替换标题显示、移除自动提取

**Files:**

- Modify: `packages/web/src/components/NoteView.tsx`

- [ ] **Step 1: 替换 NoteView 中的标题显示**

在 `NoteView.tsx` 中：

1. 添加 `import NoteTitleInput from "./shared/NoteTitleInput";`
2. 移除 `import { extractTitleFromContent } from "../lib/markdown-serializer";`
3. 添加 `const [title, setTitle] = useState(note.title);` 状态
4. 在 `useEffect` 中当 `note.id` 变化时同步 `setTitle(note.title)`
5. 添加 `handleTitleChange` 回调，debounce 后调 `updateNote` 只保存标题
6. 替换 `<h2 className="text-lg font-semibold truncate" style={{ color: "var(--text-primary)" }}>{note.title}</h2>` 为 `<NoteTitleInput value={title} onChange={handleTitleChange} />`

具体变更：

移除 import 中的 `extractTitleFromContent`：

```
// 旧
import {
  markdownToProseMirrorJSON,
  proseMirrorJSONToMarkdown,
  extractTitleFromContent,
} from "../lib/markdown-serializer";
// 新
import {
  markdownToProseMirrorJSON,
  proseMirrorJSONToMarkdown,
} from "../lib/markdown-serializer";
import NoteTitleInput from "./shared/NoteTitleInput";
```

添加 title 状态和同步 useEffect：

```
const [title, setTitle] = useState(note.title);
// 在现有的 useEffect for note.id 同步中添加 setTitle:
useEffect(() => {
  setContentJson(note.contentJson);
  setMdText(note.mdText);
  setNoteTagIds(initialTagIds ?? []);
  setTitle(note.title);
}, [note.id, initialTagIds]);
```

移除基于 extractTitleFromContent 的自动保存 useEffect（第 75-87 行），替换为：

```
useEffect(() => {
  const timeout = setTimeout(async () => {
    try {
      await updateNote(noteIdRef.current, {
        contentJson,
        mdText,
      });
    } catch {}
  }, 500);
  return () => clearTimeout(timeout);
}, [contentJson, mdText, updateNote]);
```

添加 handleTitleChange 回调：

```
const handleTitleChange = useCallback(
  async (newTitle: string) => {
    setTitle(newTitle);
    try {
      const updated = await updateNote(noteIdRef.current, { title: newTitle });
      useNotesStore.getState().updateNoteInList(noteIdRef.current, updated);
    } catch {}
  },
  [updateNote],
);
```

注意：需要在 NoteView 文件顶部导入 `useNotesStore`（已通过 `useUIStore, useTagsStore` 从 `"../stores"` 导入，需要扩展为 `useUIStore, useTagsStore, useNotesStore`）。

替换 `<h2>` 为 `<NoteTitleInput>`：

```
// 旧
<h2 className="text-lg font-semibold truncate" style={{ color: "var(--text-primary)" }}>
  {note.title}
</h2>
// 新
<NoteTitleInput value={title} onChange={handleTitleChange} />
```

- [ ] **Step 2: 移除 NoteView 中右键菜单相关的无用回调**

移除 `handleContextMenuRename` 回调（第 136 行），同时从 ContextMenu props 中移除 `onRename`、`currentName`，以及从 ContextMenu import 移除 RenameDialog 相关内容（此操作在 Task 4 中完成）。

---

### Task 3: 修改 QuickNote — 空标题创建、移除自动提取

**Files:**

- Modify: `packages/web/src/components/QuickNote.tsx`

- [ ] **Step 1: 移除 extractTitleFromContent 引用和调用**

1. 移除 `import { extractTitleFromContent } from "../lib/markdown-serializer";`
2. 移除自动保存 useEffect（第 50-57 行）中的 `extractTitleFromContent` 调用，改为仅保存 mdText：

```
useEffect(() => {
  if (!currentQuickNoteId || !inputValue.trim()) return;
  const timeout = setTimeout(async () => {
    await updateNote(currentQuickNoteId, { mdText: inputValue });
  }, 500);
  return () => clearTimeout(timeout);
}, [inputValue, currentQuickNoteId, updateNote]);
```

3. 修改 `handleInputChange` 中的 `createNote` 调用，空标题：

```
// 旧
const title = extractTitleFromContent(newValue);
const note = await createNote({ title, mdText: newValue });
// 新
const note = await createNote({ title: "", mdText: newValue });
```

---

### Task 4: 修改 MobileLayout — 空标题创建

**Files:**

- Modify: `packages/web/src/components/layouts/MobileLayout.tsx`

- [ ] **Step 1: 改空标题**

```
// 旧 (第 27 行)
const note = await createNote({ title: "新笔记" });
// 新
const note = await createNote({ title: "" });
```

---

### Task 5: 修改 NoteCard — 空标题 fallback 显示

**Files:**

- Modify: `packages/web/src/components/shared/NoteCard.tsx`

- [ ] **Step 1: 空 title 显示"未命名笔记"**

```
// 旧 (第 47 行)
<div className="font-semibold text-gray-800 text-sm truncate">{note.title}</div>
// 新
<div className="font-semibold text-gray-800 text-sm truncate">{note.title || "未命名笔记"}</div>
```

---

### Task 6: 删除 ContextMenu 重命名入口和 RenameDialog

**Files:**

- Modify: `packages/web/src/components/shared/ContextMenu.tsx`
- Delete: `packages/web/src/components/shared/RenameDialog.tsx`
- Modify: `packages/web/src/components/NoteView.tsx` (移除 ContextMenu 相关 props)

- [ ] **Step 1: 修改 ContextMenu.tsx**

1. 移除 `import RenameDialog from "./RenameDialog";`
2. 从 `ContextMenuProps` interface 中移除 `onRename: (id: string, newName: string) => void;`
3. 从组件 props 解构中移除 `onRename`
4. 移除 `const [renameOpen, setRenameOpen] = useState(false);`
5. 移除"重命名"菜单项（第 49-54 行）
6. 移除 `<RenameDialog>` 组件（第 97-102 行）

- [ ] **Step 2: 修改 NoteView.tsx 中 ContextMenu 的使用**

移除传递给 ContextMenu 的 `onRename`、`currentName` props：

```
// 旧
<ContextMenu
  itemId={note.id}
  itemType="note"
  currentName={note.title}
  currentFolderId={note.folderId}
  onDelete={handleContextMenuDelete}
  onMoveToFolder={handleContextMenuMoveToFolder}
  onAddTag={handleContextMenuAddTag}
  onRename={handleContextMenuRename}
  onCopyMarkdown={handleContextMenuCopyMarkdown}
>
// 新
<ContextMenu
  itemId={note.id}
  itemType="note"
  currentFolderId={note.folderId}
  onDelete={handleContextMenuDelete}
  onMoveToFolder={handleContextMenuMoveToFolder}
  onAddTag={handleContextMenuAddTag}
  onCopyMarkdown={handleContextMenuCopyMarkdown}
>
```

移除 `handleContextMenuRename` 回调定义（第 136 行）。

- [ ] **Step 3: 删除 RenameDialog.tsx 文件**

删除 `packages/web/src/components/shared/RenameDialog.tsx`

- [ ] **Step 4: 检查 RenameDialog 的其他引用**

搜索代码库确认没有其他地方引用 RenameDialog（已确认仅在 ContextMenu.tsx 中引用）。

---

### Task 7: 清理 extractTitleFromContent 导出

**Files:**

- Modify: `packages/web/src/lib/index.ts`

- [ ] **Step 1: 从 barrel 导出中移除 extractTitleFromContent**

```
// 旧
export {
  markdownToProseMirrorJSON,
  proseMirrorJSONToMarkdown,
  extractTitleFromContent,
} from "./markdown-serializer";
// 新
export {
  markdownToProseMirrorJSON,
  proseMirrorJSONToMarkdown,
} from "./markdown-serializer";
```

注意：`extractTitleFromContent` 函数本身仍保留在 `markdown-serializer.ts` 中（其他地方可能使用，如测试），只是从 barrel 导出移除。

- [ ] **Step 2: 更新测试文件中的 import**

在 `packages/web/tests/lib/markdown-serializer.test.ts` 中，如果 import 是从 `../../src/lib/markdown-serializer` 直接引用（当前已是），则无需改动。如果是从 barrel `../../src/lib/index` 引用，则改为直接引用。

---

### Task 8: 验证

- [ ] **Step 1: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS（无类型错误）

- [ ] **Step 2: 运行 lint**

Run: `pnpm lint`
Expected: PASS（无 lint 错误）

- [ ] **Step 3: 运行 format:check**

Run: `pnpm format:check`
Expected: PASS

- [ ] **Step 4: 运行测试**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: 手动验证**

启动 dev server (`pnpm dev`)，在浏览器中测试：

1. 打开一条已有笔记 → 标题输入框显示当前标题，可点击编辑
2. 编辑标题 → 300ms 后自动保存，侧边栏同步显示新标题
3. 按 Enter → 聚焦跳到编辑器内容区域
4. 按 Escape → 标题恢复原值
5. 创建新笔记 → 标题输入框为空，显示"输入标题..." placeholder
6. 侧边栏中空标题笔记显示"未命名笔记"
7. 右键菜单中不再有"重命名"选项
