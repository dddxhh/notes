# 标签功能重设计

## 问题描述

当前标签功能存在以下问题：

1. **创建标签无效**：点击"创建"后创建的标签未同步到 `tagsStore`，视觉上看不到效果
2. **选择已有标签 bug**：取消选中标签时没有调用 `removeTagFromNote` API 持久化；`useStorage` hook 未暴露移除方法
3. **标签筛选失效**：侧边栏/移动端标签点击的筛选逻辑有恒真 bug，实际没有过滤笔记
4. **缺少标签删除功能**：无法删除标签本身（仅能移除笔记与标签的关联，且移除也没持久化）

## 设计目标

- TagSelector 搜索框内直接创建标签（无需独立对话框）
- 保留选择已有标签的功能（toggle 选中/取消）
- 移除关联时持久化到数据库
- 支持删除标签本身，需二次确认并显示关联笔记
- 修复侧边栏/移动端标签筛选逻辑

## 改动范围

### 1. TagSelector — 搜索框内直接创建

**文件**: `packages/web/src/components/shared/TagSelector.tsx`

**改动**:

- 移除底部"新建标签"按钮和 `TagCreateDialog` 引用/导入
- 搜索框输入文本后，如果不存在匹配标签，列表底部显示"创建 'xxx'"选项（带 + 图标）
- 点击该选项 → 调用 `onCreateTag(name)` → 清空搜索框
- 已有标签选择功能保持不变

**交互流程**:

1. 点击"添加标签"按钮 → TagSelector 面板展开
2. 输入框输入文本 → 有匹配则显示列表项；无匹配则列表底部显示"创建 'xxx'"
3. 点击已有标签 → toggle 选中/取消选中
4. 点击"创建 'xxx'" → 创建新标签 + 选中 + 关联到笔记 + 清空输入

### 2. NoteView 标签交互修复

**文件**: `packages/web/src/components/NoteView.tsx`

**改动**:

- `handleAddTag(tagId)`: 取消选中时调用 `removeTagFromNote(noteId, tagId)` 持久化
- `handleRemoveTag(tagId)`: 增加 `removeTagFromNote` API 调用
- `handleCreateTag(name)`: 创建后调用 `useTagsStore().addTag(tag)` 同步到全局 store

**文件**: `packages/web/src/hooks/useStorage.ts`

**改动**: 暴露以下方法

- `removeTagFromNote(noteId, tagId)`
- `removeTagsFromNote(noteId, tagIds)`
- `deleteTag(id)`
- `getNotesForTag(tagId)`

### 3. 全局标签删除（删除标签本身）

**文件**: `packages/core/src/storage/adapter.ts`

**改动**: StorageAdapter 接口新增

- `deleteTag(id: string): Promise<void>` — 删除标签
- `getNotesForTag(tagId: string): Promise<Note[]>` — 获取关联笔记列表

**文件**: `packages/core/src/storage/web-adapter.ts`

**改动**: 实现 `deleteTag`

- DELETE FROM tags WHERE id=?
- DELETE FROM note_tags WHERE tag_id=?（手动清理，wa-sqlite CASCADE 可能不可靠）

**改动**: 实现 `getNotesForTag`

- SELECT notes.\* FROM notes INNER JOIN note_tags ON notes.id=note_tags.note_id WHERE note_tags.tag_id=?

**文件**: `packages/web/src/lib/sqlite-shared-worker.ts`

**同步实现** `deleteTag` 和 `getNotesForTag`

**文件**: `packages/web/src/stores/tagsStore.ts`

**改动**: 增加 `deleteTag(id: string)` action

**文件**: `packages/web/src/components/shared/DeleteTagDialog.tsx` (新建)

**组件设计**:

- Radix Dialog 组件
- 标题: "删除标签 'xxx'"
- 内容: "以下笔记将失去此标签：" + 关联笔记标题列表（最多显示 10 个，超出显示"...等 N 个笔记"）
- 按钮: 取消 / 确认删除（红色警告样式）

**文件**: `packages/web/src/components/desktop/Sidebar.tsx`

**改动**: 每个标签旁增加小型 × 删除按钮

- 点击 × → 打开 DeleteTagDialog
- 确认 → 调用 `deleteTag(id)` + `useTagsStore().deleteTag(id)` → 刷新

**文件**: `packages/web/src/components/mobile/MobileDrawer.tsx`

**改动**: 同上，移动端标签旁增加删除按钮

### 4. 侧边栏/移动端标签筛选修复

**文件**: `packages/web/src/components/desktop/Sidebar.tsx`

**改动**: 修复 `filteredNotes` 逻辑

- 有 `activeTagIds` 时，通过 `storage.getNotesForTag(tagId)` 获取匹配的笔记 ID 集合
- 多个标签时取交集
- 替换当前的恒真 bug

**文件**: `packages/web/src/components/mobile/NoteListMobile.tsx`

**改动**: 将 `selectedTagId` 实际用于笔记过滤，使用 `getNotesForTag` 获取关联笔记

**文件**: `packages/web/src/components/QuickNote.tsx`

**改动**: 同上，修复 `selectedTagId` 筛选

**文件**: `packages/web/src/components/mobile/MobileDrawer.tsx`

**改动**: 标签点击应设置筛选状态，而非仅关闭抽屉

### 5. 删除 TagCreateDialog 组件

**文件**: `packages/web/src/components/shared/TagCreateDialog.tsx` — 删除此文件

## 不在范围内

- 标签分组/嵌套
- 标签颜色自定义
- 标签拖拽排序
