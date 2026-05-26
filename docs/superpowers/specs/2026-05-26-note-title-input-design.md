# 笔记标题独立编辑功能设计

## 背景

当前笔记标题完全从内容自动提取（`extractTitleFromContent` 取 markdown 第一行去掉 `#`），无独立编辑入口。NoteView 中标题为只读 `<h2>`，右键菜单"重命名"虽有 RenameDialog UI 但回调为空壳 no-op。

## 决策

| 决策项           | 选择                                     |
| ---------------- | ---------------------------------------- |
| 标题与内容关系   | 独立标题，不再从内容自动提取             |
| 编辑方式         | 内嵌标题输入框（styled `<input>`）       |
| 实现方案         | 方案 A：styled `<input>` 替换现有 `<h2>` |
| 新建笔记初始标题 | 空字符串 + placeholder `"输入标题..."`   |
| 右键菜单重命名   | 删除                                     |

## 组件设计

### NoteTitleInput

新组件，位于 `packages/web/src/components/shared/NoteTitleInput.tsx`。

**接口：**

```typescript
interface NoteTitleInputProps {
  value: string;
  onChange: (title: string) => void;
  placeholder?: string;
  editorRef?: React.RefObject<any>;
}
```

**渲染：** `<input type="text">`，样式模拟标题外观。

**样式细节：**

- 字体/大小/粗细与当前 `<h2>` 一致（Tailwind 标题样式变量）
- 占满可用宽度，无内边距（与编辑器内容区域对齐）
- 非聚焦：透明背景，无边框，光标 `text`
- 聚焦：底部 1px 边框（CSS 变量 accent 颜色）
- placeholder 颜色：CSS 变量 muted foreground

**键盘交互：**

- Enter → 聚焦编辑器内容区域（TipTap），不换行
- Escape → 取消当前输入，恢复为原标题值

### NoteView 修改

- 用 `<NoteTitleInput>` 替换 `<h2>{note.title}</h2>`
- `onChange` 触发时 debounce 300ms 调用 `updateNote(noteId, { title })`

## 标题更新逻辑

1. **NoteTitleInput.onChange** → debounce 300ms → `useStorage().updateNote(noteId, { title })` → SQLite 存储
2. **移除自动提取**：删除 NoteView 中 `extractTitleFromContent(mdText)` 的 useEffect
3. **notesStore 同步**：`updateNote` 后需同步更新 `notesStore` 中对应笔记的 `title`（修复已有 bug：当前 store 未同步标题更新）
4. **侧边栏/列表实时反映**：标题更新后 sidebar/search 等列表视图立即反映新标题

## 新建笔记流程

- **MobileLayout**：`createNote({ title: "" })`，不再用 `"新笔记"`
- **QuickNote**：`createNote({ title: "" })`，删除 `extractTitleFromContent` 逻辑
- **空标题显示**：当 `title === ""` 时，NoteCard/侧边栏/搜索结果显示 `"未命名笔记"` 作为展示文案，存储值仍为空字符串
- **NoteTitleInput placeholder**：空字符串时显示 `"输入标题..."`

## 删除的内容

- ContextMenu 中"重命名"菜单项 → 删除
- RenameDialog 组件 → 删除（空壳，不再需要）
- `extractTitleFromContent` 在 NoteView 和 QuickNote 中的调用 → 删除
- NoteView 中基于 `extractTitleFromContent` 的自动标题更新 useEffect → 删除

## 需变更的文件

| 文件                                                    | 变更                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/web/src/components/shared/NoteTitleInput.tsx` | 新增                                                                        |
| `packages/web/src/components/NoteView.tsx`              | 替换 `<h2>` 为 `<NoteTitleInput>`，删除自动提取逻辑，添加 debounce 标题保存 |
| `packages/web/src/components/shared/ContextMenu.tsx`    | 删除"重命名"菜单项                                                          |
| `packages/web/src/components/shared/RenameDialog.tsx`   | 删除文件                                                                    |
| `packages/web/src/components/QuickNote.tsx`             | `createNote({ title: "" })`，删除 `extractTitleFromContent` 调用            |
| `packages/web/src/components/layouts/MobileLayout.tsx`  | `createNote({ title: "" })`                                                 |
| `packages/web/src/components/shared/NoteCard.tsx`       | 空 title 时显示 `"未命名笔记"`                                              |
| `packages/web/src/stores/notesStore.ts`                 | 确保 `updateNote` 同步标题到 store                                          |

## 测试要点

- NoteTitleInput：聚焦/失焦样式切换、Enter 聚焦编辑器、Escape 恢复原标题、placeholder 显示
- NoteView：标题修改 debounce 保存到存储层、store 同步、侧边栏即时反映
- 新建笔记：空标题创建、placeholder 显示、侧边栏显示"未命名笔记"
- 删除验证：右键菜单无"重命名"、RenameDialog 不再引用
