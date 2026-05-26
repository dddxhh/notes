# 侧栏笔记列表功能增强 — 设计文档

日期：2026-05-26

## 概述

增强笔记应用侧栏的 4 个功能：

1. 未命名笔记显示优化
2. 侧栏新增/删除笔记
3. 文件夹管理功能增强
4. 笔记卡片显示标签

## 1. 未命名笔记显示优化

### 决策

显示层替换，title 字段保持空。

### 详细设计

- 当 `note.title` 为空字符串时，`NoteCard` 调用 `extractTitleFromContent(note.mdText)` 取内容首行作为显示标题
- 自动提取的标题使用**淡色 + 斜体样式**，与用户手动输入的标题做视觉区分
- 编辑器的 `NoteTitleInput` 保持 placeholder "输入标题..."，不自动填入提取标题
- title 字段只在用户手动输入后才从空变为有值
- `extractTitleFromContent` 已存在于 `packages/web/src/lib/markdown-serializer.ts`，逻辑：取内容首行非空文本，去除标题标记，截断 50 字符

### 需要改动

| 文件                                                    | 改动                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/web/src/components/shared/NoteCard.tsx`       | 引入 `extractTitleFromContent`，空标题时用提取内容 + 淡色斜体样式渲染 |
| `packages/web/src/components/mobile/NoteListMobile.tsx` | 同上，移动端也适配                                                    |

### 边界情况

- 内容为空：`extractTitleFromContent("")` 已返回 "未命名笔记"，保持现状
- 内容只有空白行：同上
- title 有值：直接显示，不做任何替换

## 2. 侧栏新增和删除笔记

### 决策

顶部"新建"按钮 + 卡片"⋯"菜单按钮。

### 详细设计

#### 新建笔记

- 在侧栏顶部区域（文件夹下拉框右侧）增加"新建笔记"按钮
- 点击后调用 `createNote({ title: "" })`，创建空标题笔记并自动选中/导航到该笔记
- 移动端同理适配

#### 删除笔记 — 卡片"⋯"菜单

- 每个 `NoteCard` 右上角增加"⋯"按钮（hover 时显示)，移动端始终显示)
- 点击弹出 Radix DropdownMenu，包含：
  - **删除笔记**：软删除（设 `deletedAt`），笔记移到回收站
  - **移至文件夹**：打开 `MoveNoteDialog` 让用户选择目标文件夹
- 接通当前 `NoteView.tsx` 中的 noop 回调：`handleContextMenuDelete` 和 `handleContextMenuMoveToFolder`

#### 确认机制

- 删除笔记前弹出确认对话框（类似已有的 `DeleteTagDialog`），显示笔记标题和警告文本
- 确认后执行软删除

### 需要改动

| 文件                                                      | 改动                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/web/src/components/desktop/Sidebar.tsx`         | 顶部增加"新建"按钮                                                     |
| `packages/web/src/components/shared/NoteCard.tsx`         | 右上角增加"⋯"按钮 + Radix DropdownMenu                                 |
| `packages/web/src/components/shared/ContextMenu.tsx`      | 重构或替换为 NoteCard 内嵌菜单模式                                     |
| `packages/web/src/components/NoteView.tsx`                | 接通 `handleContextMenuDelete` 和 `handleContextMenuMoveToFolder` 回调 |
| `packages/web/src/components/shared/DeleteNoteDialog.tsx` | 新建：确认删除笔记的对话框                                             |
| `packages/web/src/components/mobile/NoteListMobile.tsx`   | 新建按钮适配                                                           |
| `packages/web/src/components/mobile/MobileFAB.tsx`        | 确认新建逻辑与桌面端统一                                               |

## 3. 文件夹管理功能增强

### 决策

保留下拉框模式，在下拉框内增加创建/删除/重命名操作。

### 详细设计

#### FolderTreeDropdown 增强

在现有 `FolderTreeDropdown` 的 popover 内容中增加操作区域：

- **新建文件夹**：底部增加"➕ 新建文件夹"链接/按钮，点击后在 popover 内显示 inline 输入框（输入名称），可选 parentId（当前选中文件夹作为父级）
- **重命名文件夹**：选中文件夹时，显示"✏️ 重命名"选项，点击后 inline 输入框修改名称
- **删除文件夹**：选中非"全部笔记"时，显示"🗑️ 删除文件夹"选项

#### 删除文件夹确认对话框

弹出 `DeleteFolderDialog`：

- 显示文件夹名称和下属笔记数量
- 默认行为说明："删除后，笔记将回到全部笔记"
- 复选框（默认不勾选）："同时删除文件夹内的所有笔记"
  - **不勾选**（默认）：删除文件夹，旗下笔记的 `folderId` 设为 null，笔记回到"全部笔记"
  - **勾选**：对文件夹内所有笔记执行软删除（`deletedAt = now`），笔记移到回收站
- 根级文件夹（"全部笔记"）不允许删除

#### 数据层改动

新增两个批量方法到 `StorageAdapter` 接口：

- `updateNotesFolderId(oldFolderId: string, newFolderId: string | null): Promise<void>` — 一条 SQL 批量将某文件夹下所有未删除笔记的 `folder_id` 设为 `newFolderId`
- `softDeleteNotesByFolder(folderId: string): Promise<void>` — 一条 SQL 批量将某文件夹下所有笔记的 `deleted_at` 设为当前时间

优先使用批量 SQL 而非循环调用 `updateNote`/`deleteNote`，减少写操作次数和广播通知。

### 需要改动

| 文件                                                         | 改动                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `packages/web/src/components/desktop/FolderTreeDropdown.tsx` | 增加创建/删除/重命名操作 UI                                      |
| `packages/web/src/components/shared/DeleteFolderDialog.tsx`  | 新建：删除文件夹确认对话框（含"同时删除笔记"复选框）             |
| `packages/core/src/storage/adapter.ts`                       | 新增 `updateNotesFolderId` 和 `softDeleteNotesByFolder` 方法签名 |
| `packages/core/src/storage/web-adapter.ts`                   | 实现上述批量方法                                                 |
| `packages/web/src/lib/sqlite-shared-worker.ts`               | 同步实现 SharedWorker 版本的批量方法                             |
| `packages/web/src/stores/foldersStore.ts`                    | 增加 `deleteFolder` action（含清理逻辑）                         |
| `packages/web/src/components/mobile/MobileDrawer.tsx`        | 移动端文件夹管理操作适配                                         |

## 4. 笔记卡片显示标签

### 决策

显示前 N 个标签 + "+N" 溢出计数，hover 显示全部。

### 详细设计

- `NoteCard` 在日期行下方增加标签行
- 最多显示 2 个 `TagBadge`，超出部分用 "+N" 圆角小标签
- hover "+N" 标签时，用 Radix Tooltip 显示所有标签名称列表
- 当前 `Sidebar.tsx` 渲染 `NoteCard` 时未传递 tags prop，需要异步加载或预加载

#### 标签数据获取策略

- 方案：在 `notesStore` 或侧栏渲染逻辑中，预加载所有笔记的 tags 映射
- 初始化时：`listNotes()` → 对每个 note 调用 `getTagsForNote()` → 构建 `Map<noteId, Tag[]>`
- 新增/删除/修改 tag 时更新映射
- 传入 NoteCard 的 `tags` prop

### 需要改动

| 文件                                                    | 改动                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `packages/web/src/components/shared/NoteCard.tsx`       | 增加 tags 区域 + overflow 计数 + Tooltip                   |
| `packages/web/src/components/desktop/Sidebar.tsx`       | 为 NoteCard 传递 tags 数据                                 |
| `packages/web/src/components/mobile/NoteListMobile.tsx` | 同上                                                       |
| `packages/web/src/stores/notesStore.ts`                 | 增加 `noteTagsMap: Map<string, Tag[]>` 状态和加载/更新逻辑 |
| `packages/web/src/components/shared/TagBadge.tsx`       | 确认样式可用于卡片内小尺寸场景                             |

### 性能考虑

- 虚拟列表使用 `@tanstack/react-virtual`，只渲染可见卡片，标签映射只在可见项查询
- 标签映射应在笔记列表加载时一次性构建，不在每帧渲染中异步请求

## 整体数据流影响

### StorageAdapter 新增方法

```
updateNotesFolderId(oldFolderId: string, newFolderId: string | null): Promise<void>
softDeleteNotesByFolder(folderId: string): Promise<void>
```

### Zustand stores 变动

- `foldersStore`：增加 `deleteFolder` action
- `notesStore`：增加 `noteTagsMap` 状态和相关 actions

### 不变的部分

- StorageAdapter 已有的所有 CRUD 方法（createNote, updateNote, deleteNote, createFolder, updateFolder, deleteFolder, listNotes, getTagsForNote 等）
- Note 数据模型（title 字段保持空，显示层做替换）
- Folder 数据模型（parentId 层级结构不变）
- Tag 数据模型（flat id+name 不变）

## 实现优先级建议

1. **未命名笔记优化**（最简单，改动最少，立即改善用户体验）
2. **侧栏新建/删除笔记**（核心 CRUD 交互缺失，高优先级）
3. **笔记卡片标签显示**（增强信息密度，中等优先级）
4. **文件夹管理增强**（最复杂，涉及批量操作和确认对话框）
