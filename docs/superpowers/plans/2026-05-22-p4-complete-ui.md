# 笔记应用完整 UI 体验 实施计划 (P4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完善桌面双栏布局交互、移动端堆栈导航、文件夹树、标签管理 UI、多维度搜索界面、暗色/亮色主题切换系统、代码块语法高亮、表格支持、待办/复选框扩展，打造完整可用的 UI 体验。

**Architecture:** 桌面端侧栏包含文件夹树 + 笔记列表 + 标签筛选器；搜索界面使用 SearchInput 多维度组合查询 UI；暗色主题通过 CSS 变量 + TailwindCSS dark 模式切换；新增 TipTap 扩展（TaskList、Table、CodeBlockLowlight）注册到编辑器。

**Tech Stack:** TipTap v2 (@tiptap/extension-task-list, @tiptap/extension-table, @tiptap/extension-code-block-lowlight), lowlight (语法高亮), Radix UI (@radix-ui/react-dialog, @radix-ui/react-dropdown-menu, @radix-ui/react-context-menu, @radix-ui/react-tabs), TailwindCSS dark mode, React 18, Zustand

**设计规格:** `docs/superpowers/specs/2026-05-21-notes-app-design.md`

**前置条件:** P0+P1+P2 已完成（StorageAdapter、Store、TipTap 编辑器、布局骨架均可用）。P3 可并行进行，无硬依赖。

---

## 文件结构

```
packages/web/src/
├── components/
│   ├── shared/
│   │   ├── Editor.tsx               # (更新：注册 TaskList/Table/CodeBlockLowlight)
│   │   ├── EditorToolbar.tsx        # (更新：添加任务列表/表格/代码高亮按钮)
│   │   ├── MarkdownEditor.tsx       # (更新：支持 TaskList/Table/CodeBlock 的 MD 渲染)
│   │   ├── NoteView.tsx             # (已有，P3 更新过 → P4 更新：标签管理、右键菜单)
│   │   ├── NoteCard.tsx             # (已有，P3 更新过)
│   │   ├── TagBadge.tsx             # (已有)
│   │   ├── ModeToggle.tsx           # (已有)
│   │   ├── SearchBar.tsx            # 新增：搜索输入框 + 实时搜索触发
│   │   ├── SearchFilterPanel.tsx    # 新增：多维度筛选面板（文件夹/标签/时间/类型）
│   │   ├── SearchResultList.tsx     # 新增：搜索结果列表（关键词高亮）
│   │   ├── ThemeToggle.tsx          # 新增：暗色/亮色主题切换按钮
│   │   ├── FolderCreateDialog.tsx   # 新增：新建文件夹对话框（Radix Dialog）
│   │   ├── TagCreateDialog.tsx      # 新增：新建标签对话框
│   │   ├── TagSelector.tsx          # 新增：标签多选器（为笔记添加标签）
│   │   ├── ContextMenu.tsx          # 新增：笔记/文件夹右键菜单（Radix ContextMenu）
│   │   ├── ConfirmDialog.tsx        # 新增：危险操作确认对话框（Radix AlertDialog）
│   │   ├── RenameDialog.tsx         # 新增：笔记/文件夹重命名对话框
│   │   ├── MoveNoteDialog.tsx       # 新增：移动笔记到文件夹对话框
│   │   ├── TrashView.tsx            # 新增：回收站页面（查看/恢复/彻底删除）
│   │   ├── AttachmentIntegrityBanner.tsx # 新增：附件完整性校验提示条
│   │   └── Toast.tsx                # (已有，P3 创建)
│   ├── desktop/
│   │   ├── Sidebar.tsx              # (重构：下拉覆盖层文件夹 + 笔记列表 + 搜索 + 标签)
│   │   ├── FolderTree.tsx           # 新增：可折叠嵌套文件夹树
│   │   └── FolderTreeDropdown.tsx   # 新增：文件夹树下拉覆盖层（Radix Popover）
│   ├── mobile/
│   │   ├── NoteListMobile.tsx       # (更新：标签/文件夹筛选集成)
│   │   ├── MobileDrawer.tsx         # 新增：移动端抽屉（文件夹/标签导航）
│   │   ├── MobileSearch.tsx         # 新增：移动端搜索页面
│   │   ├── MobileSettings.tsx       # 新增：移动端设置页面（主题切换等）
│   │   └── MobileFAB.tsx            # 新增：移动端浮动操作按钮
│   ├── layouts/
│   │   ├── DesktopLayout.tsx        # (更新：侧栏可折叠、响应式宽度调整)
│   │   └── MobileLayout.tsx         # (更新：搜索/设置页面、@use-gesture/react 滑动手势)
│   ├── QuickNote.tsx                # (更新：集成标签筛选、搜索入口)
│   └── NoteView.tsx                 # (更新：标签管理、右键菜单)
├── hooks/
│   ├── useResponsive.ts             # (已有)
│   ├── useStorage.ts                # (已有)
│   ├── useAutoSave.ts               # (已有)
│   ├── useSearch.ts                 # 新增：搜索状态管理 Hook
│   ├── useTheme.ts                  # 新增：主题切换 Hook（含 localStorage 持久化）
│   ├── useFolderTree.ts             # 新增：文件夹树数据构建 Hook
│   ├── useAttachmentIntegrity.ts    # 新增：启动时附件完整性校验 Hook
│   └── index.ts                     # (更新导出)
├── stores/
│   ├── notesStore.ts                # (已有，需增强：回收站笔记管理)
│   ├── foldersStore.ts              # (已有，需增强：树形数据构建)
│   ├── tagsStore.ts                 # 新增：标签 Zustand store
│   ├── uiStore.ts                   # (更新：搜索状态、主题持久化、回收站入口)
│   └── index.ts                     # (更新导出)
├── lib/
│   ├── tiptap-setup.ts              # (更新：注册 TaskList/Table/CodeBlockLowlight)
│   ├── markdown-serializer.ts       # (已有，P3 更新过 → P4 更新：TaskList/Table/CodeBlock)
│   ├── sqlite-init.ts               # (已有 → 重构：SharedWorker 封装)
│   ├── sqlite-shared-worker.ts      # 新增：SharedWorker 单写锁封装
│   ├── highlight-languages.ts       # 新增：lowlight 常用语言配置
│   ├── dompurify-setup.ts           # 新增：DOMPurify 初始化配置
│   └── index.ts                     # (更新导出)
├── styles/
│   ├── globals.css                  # (更新：暗色主题变量、文件夹树样式、搜索样式、任务列表/表格/代码高亮样式、touch-action、回收站样式)
│   ├── index.css                    # (已有)
└── App.tsx                          # (更新：主题初始化 + 附件完整性校验)

packages/web/tests/
├── shared/
│   ├── SearchBar.test.tsx           # 新增
│   ├── SearchFilterPanel.test.tsx   # 新增
│   ├── SearchResultList.test.tsx    # 新增
│   ├── ThemeToggle.test.tsx         # 新增
│   ├── FolderCreateDialog.test.tsx  # 新增
│   ├── TagSelector.test.tsx         # 新增
│   ├── ContextMenu.test.tsx         # 新增
│   ├── ConfirmDialog.test.tsx       # 新增
│   ├── RenameDialog.test.tsx        # 新增
│   ├── MoveNoteDialog.test.tsx      # 新增
│   ├── TrashView.test.tsx           # 新增
│   ├── AttachmentIntegrityBanner.test.tsx # 新增
│   ├── Editor.test.tsx              # (更新：TaskList/Table/CodeBlock 测试)
│   └── EditorToolbar.test.tsx       # (更新)
├── desktop/
│   ├── FolderTree.test.tsx          # 新增
│   ├── FolderTreeDropdown.test.tsx  # 新增
│   ├── Sidebar.test.tsx             # 新增（重构版）
├── mobile/
│   ├── MobileSearch.test.tsx        # 新增
│   ├── MobileSettings.test.tsx      # 新增
│   ├── MobileFAB.test.tsx           # 新增
│   └── MobileDrawer.test.tsx        # 新增
├── hooks/
│   ├── useSearch.test.ts            # 新增
│   ├── useTheme.test.ts             # 新增
│   ├── useFolderTree.test.ts        # 新增
│   └── useAttachmentIntegrity.test.ts # 新增
├── lib/
│   ├── dompurify-setup.test.ts      # 新增
│   ├── sqlite-shared-worker.test.ts # 新增
│   └── highlight-languages.test.ts  # 新增
└── layouts/
│   ├── DesktopLayout.test.tsx       # (更新：侧栏折叠测试)
│   ├── MobileLayout.test.tsx        # (更新：搜索/设置导航测试、滑动手势)
```

---

## Task 34: 安装 P4 新依赖

**Files:**

- Modify: `packages/web/package.json`

P4 需要新增 TipTap 扩展（TaskList、Table、CodeBlockLowlight）、Radix UI 组件、lowlight 语法高亮库、以及设计规格中要求的 `@use-gesture/react`（滑动/长按交互）、`@tanstack/react-virtual`（虚拟滚动）、`dompurify`（Markdown XSS 防御）。

- [ ] **Step 1: 添加依赖到 packages/web/package.json**

在 dependencies 中添加：

```
"@tiptap/extension-task-list": "^2",
"@tiptap/extension-task-item": "^2",
"@tiptap/extension-table": "^2",
"@tiptap/extension-table-row": "^2",
"@tiptap/extension-table-cell": "^2",
"@tiptap/extension-table-header": "^2",
"@tiptap/extension-code-block-lowlight": "^2",
"@tiptap/extension-horizontal-rule": "^2",
"lowlight": "^3",
"@radix-ui/react-dialog": "latest",
"@radix-ui/react-dropdown-menu": "latest",
"@radix-ui/react-context-menu": "latest",
"@radix-ui/react-tabs": "latest",
"@radix-ui/react-popover": "latest",
"@radix-ui/react-checkbox": "latest",
"@radix-ui/react-alert-dialog": "latest",
"@use-gesture/react": "latest",
"@tanstack/react-virtual": "latest",
"dompurify": "^3"
```

> **补充说明：**
>
> - `@radix-ui/react-alert-dialog` — 用于删除确认、重命名等危险操作的确认对话框
> - `@use-gesture/react` — 设计规格明确要求，用于移动端滑动/长按交互（抽屉手势、长按触发右键菜单）
> - `@tanstack/react-virtual` — 设计规格明确要求，用于笔记列表虚拟滚动（大量笔记时的性能优化）
> - `dompurify` — 设计规格明确要求，防止 Markdown 渲染 XSS 攻击

Run: `pnpm install`

- [ ] **Step 2: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "feat: add P4 dependencies - TipTap TaskList/Table/CodeBlockLowlight, Radix UI, lowlight"
```

---

## Task 35: 暗色/亮色主题系统

**Files:**

- Create: `packages/web/src/hooks/useTheme.ts`
- Create: `packages/web/src/components/shared/ThemeToggle.tsx`
- Modify: `packages/web/src/styles/globals.css`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/stores/uiStore.ts`
- Create: `packages/web/tests/hooks/useTheme.test.ts`
- Create: `packages/web/tests/shared/ThemeToggle.test.tsx`

暗色主题使用 TailwindCSS `dark` 类策略 + CSS 变量。主题选择持久化到 localStorage。

- [ ] **Step 1: 更新 globals.css 添加暗色主题变量和样式**

在 globals.css 中添加：

```css
/* 主题 CSS 变量 */
:root {
  --bg-primary: #fafafa;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-tertiary: #94a3b8;
  --border-color: #e2e8f0;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --danger: #ef4444;
  --code-bg: #f1f5f9;
  --sidebar-bg: #ffffff;
  --card-bg: #ffffff;
  --hover-bg: #f1f5f9;
}

.dark {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --border-color: #334155;
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --danger: #f87171;
  --code-bg: #334155;
  --sidebar-bg: #1e293b;
  --card-bg: #1e293b;
  --hover-bg: #334155;
}

/* 将现有硬编码颜色替换为 CSS 变量 */
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.ProseMirror pre {
  background-color: var(--code-bg);
}

.ProseMirror blockquote {
  border-left-color: var(--border-color);
  color: var(--text-secondary);
}

/* 暗色主题下编辑器样式调整 */
.dark .ProseMirror p.is-editor-empty:first-child::before {
  color: var(--text-tertiary);
}
```

- [ ] **Step 2: 更新 TailwindCSS 配置启用 dark 模式**

在 `packages/web/tailwind.config.js` 中设置 `darkMode: 'class'`。

- [ ] **Step 3: 编写 useTheme.ts**

```typescript
// packages/web/src/hooks/useTheme.ts
import { useEffect } from "react";
import { useUIStore } from "../stores";

export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggleTheme };
}
```

- [ ] **Step 4: 编写 ThemeToggle.tsx**

```typescript
// packages/web/src/components/shared/ThemeToggle.tsx
import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      title={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
```

- [ ] **Step 5: 更新 App.tsx**

在 App.tsx 初始化时调用 `useTheme()` 以加载 localStorage 中的主题偏好：

```typescript
// App.tsx 中添加 useTheme() 调用（只在根组件初始化一次）
```

- [ ] **Step 6: 更新 uiStore.ts**

确保 `theme` 默认值根据系统偏好设置：

```typescript
// uiStore.ts 中 theme 初始值改为：
// theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
// 或者保持 'light' 由 useTheme 在初始化时从 localStorage 覆盖
```

- [ ] **Step 7: 编写 useTheme.test.ts**

测试：初始主题加载、切换主题、localStorage 持久化、dark class 添加/移除。

- [ ] **Step 8: 编写 ThemeToggle.test.tsx**

测试：按钮渲染、点击切换主题、图标变化。

- [ ] **Step 9: Commit**

```bash
git add packages/web/src/hooks/useTheme.ts packages/web/src/components/shared/ThemeToggle.tsx packages/web/src/styles/globals.css packages/web/src/App.tsx packages/web/src/stores/uiStore.ts packages/web/tailwind.config.js packages/web/tests/hooks/useTheme.test.ts packages/web/tests/shared/ThemeToggle.test.tsx
git commit -m "feat: add dark/light theme system with CSS variables and localStorage persistence"
```

---

## Task 36: 标签 Zustand Store 和管理 UI

**Files:**

- Create: `packages/web/src/stores/tagsStore.ts`
- Modify: `packages/web/src/stores/index.ts`
- Create: `packages/web/src/components/shared/TagCreateDialog.tsx`
- Create: `packages/web/src/components/shared/TagSelector.tsx`
- Create: `packages/web/tests/shared/TagCreateDialog.test.tsx`
- Create: `packages/web/tests/shared/TagSelector.test.tsx`

标签需要独立的 store 和 UI：创建标签、为笔记添加/移除标签、标签筛选。

- [ ] **Step 1: 编写 tagsStore.ts**

```typescript
// packages/web/src/stores/tagsStore.ts
import { create } from "zustand";
import type { Tag } from "@notes/core";

interface TagsState {
  tags: Tag[];
  loading: boolean;
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  removeTag: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useTagsStore = create<TagsState>((set) => ({
  tags: [],
  loading: false,
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
  removeTag: (id) => set((state) => ({ tags: state.tags.filter((t) => t.id !== id) })),
  setLoading: (loading) => set({ loading }),
}));
```

- [ ] **Step 2: 更新 stores/index.ts**

添加 `export { useTagsStore } from "./tagsStore";`

- [ ] **Step 3: 编写 TagCreateDialog.tsx**

使用 Radix UI Dialog 实现新建标签弹窗：

```typescript
// packages/web/src/components/shared/TagCreateDialog.tsx
// Radix Dialog + input + "创建" 按钮
// 调用 storage.createTag(name) → tagsStore.addTag(tag)
```

- [ ] **Step 4: 编写 TagSelector.tsx**

为笔记添加/移除标签的多选组件：

```typescript
// packages/web/src/components/shared/TagSelector.tsx
// 显示所有可用标签（来自 tagsStore）
// 已选标签高亮，点击切换选中/取消
// 支持搜索过滤标签名称
// 选中/取消时调用 storage.addTagToNote/removeTagFromNote
// 底部"新建标签"按钮 → 打开 TagCreateDialog
```

- [ ] **Step 5: 编写 TagCreateDialog.test.tsx**

测试：Dialog 打开/关闭、输入标签名称、创建成功、重复名称提示。

- [ ] **Step 6: 编写 TagSelector.test.tsx**

测试：标签列表渲染、选中/取消切换、搜索过滤、新建标签按钮。

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/stores/tagsStore.ts packages/web/src/stores/index.ts packages/web/src/components/shared/TagCreateDialog.tsx packages/web/src/components/shared/TagSelector.tsx packages/web/tests/shared/TagCreateDialog.test.tsx packages/web/tests/shared/TagSelector.test.tsx
git commit -m "feat: add tags store and management UI (TagCreateDialog, TagSelector)"
```

---

## Task 37: 文件夹树组件（下拉覆盖层设计）

**Files:**

- Create: `packages/web/src/hooks/useFolderTree.ts`
- Create: `packages/web/src/components/desktop/FolderTree.tsx`
- Create: `packages/web/src/components/desktop/FolderTreeDropdown.tsx`
- Create: `packages/web/src/components/shared/FolderCreateDialog.tsx`
- Create: `packages/web/tests/hooks/useFolderTree.test.ts`
- Create: `packages/web/tests/desktop/FolderTree.test.tsx`
- Create: `packages/web/tests/desktop/FolderTreeDropdown.test.tsx`
- Create: `packages/web/tests/shared/FolderCreateDialog.test.tsx`

文件夹树使用嵌套数据结构渲染可折叠树。**按照设计规格"双栏聚焦"设计**：文件夹树在桌面端以**下拉覆盖层**形式展示（而非永久占据侧栏区域），点击侧栏顶部"文件夹"按钮弹出，选中后自动收起。移动端以抽屉形式展示。

- [ ] **Step 1: 编写 useFolderTree.ts**

将扁平的 `folders[]` 数组转换为嵌套树结构：

```typescript
// packages/web/src/hooks/useFolderTree.ts
import { useMemo } from "react";
import { useFoldersStore } from "../stores";
import type { Folder } from "@notes/core";

export interface FolderTreeNode {
  folder: Folder;
  children: FolderTreeNode[];
  expanded: boolean;
}

export function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  for (const folder of folders) {
    map.set(folder.id, { folder, children: [], expanded: false });
  }

  for (const folder of folders) {
    const node = map.get(folder.id)!;
    if (folder.parentId && map.has(folder.parentId)) {
      map.get(folder.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function useFolderTree() {
  const folders = useFoldersStore((s) => s.folders);
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  return { tree };
}
```

- [ ] **Step 2: 编写 FolderTree.tsx**

可折叠嵌套树，每个节点显示文件夹名称和笔记数量：

```typescript
// packages/web/src/components/desktop/FolderTree.tsx
// 递归渲染 FolderTreeNode[]
// 每个节点：展开/折叠按钮 + 文件夹名称 + 笔记数量
// 点击文件夹名 → 选中 → 筛选笔记列表
// 右键 → ContextMenu（新建子文件夹、重命名、删除）
// "全部笔记" 作为根选项（currentFolderId = null）
// 选中文件夹后如果作为下拉使用 → 调用 onFolderSelect 回调
```

- [ ] **Step 3: 编写 FolderTreeDropdown.tsx**

下拉覆盖层组件，符合设计规格的"双栏聚焦"交互：

```typescript
// packages/web/src/components/desktop/FolderTreeDropdown.tsx
// 使用 Radix Popover 实现下拉覆盖层：
// - PopoverTrigger: 侧栏顶部的"文件夹"按钮，显示当前文件夹名或"全部笔记"
// - PopoverContent: FolderTree 组件，点击文件夹后：
//   1. 更新 foldersStore.currentFolderId
//   2. 自动收起下拉（popover.close）
//   3. 笔记列表刷新为当前文件夹下的笔记
// - 下拉宽度 280px，最大高度 400px（超出滚动）
```

- [ ] **Step 4: 编写 FolderCreateDialog.tsx**

使用 Radix UI Dialog 实现新建文件夹弹窗：

```typescript
// packages/web/src/components/shared/FolderCreateDialog.tsx
// Radix Dialog + input (文件夹名) + parentId 选择器（下拉）
// 调用 storage.createFolder({ name, parentId }) → foldersStore.addFolder(folder)
```

- [ ] **Step 4: 编写 useFolderTree.test.ts**

测试：扁平数组 → 树构建、嵌套层级、空列表、根节点识别。

- [ ] **Step 5: 编写 FolderTree.test.tsx**

测试：树渲染、展开/折叠、文件夹选中、右键菜单。

- [ ] **Step 6: 编写 FolderCreateDialog.test.tsx**

测试：Dialog 打开/关闭、输入名称、选择父文件夹、创建成功。

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/hooks/useFolderTree.ts packages/web/src/components/desktop/FolderTree.tsx packages/web/src/components/shared/FolderCreateDialog.tsx packages/web/tests/hooks/useFolderTree.test.ts packages/web/tests/desktop/FolderTree.test.tsx packages/web/tests/shared/FolderCreateDialog.test.tsx
git commit -m "feat: add folder tree component with collapsible nested structure"
```

---

## Task 38: 右键上下文菜单

**Files:**

- Create: `packages/web/src/components/shared/ContextMenu.tsx`
- Create: `packages/web/tests/shared/ContextMenu.test.tsx`

笔记/文件夹的右键菜单，提供删除、移动、重命名等操作。

- [ ] **Step 1: 编写 ContextMenu.tsx**

使用 Radix UI ContextMenu 实现右键菜单：

```typescript
// packages/web/src/components/shared/ContextMenu.tsx
// Radix ContextMenu.Root + Trigger + Content
// 通用菜单项：
// - 重命名
// - 移动到文件夹
// - 添加标签
// - 删除（笔记软删除、文件夹硬删除）
// - 复制 Markdown
```

- [ ] **Step 2: 编写 ContextMenu.test.tsx**

测试：右键菜单触发、菜单项渲染、点击菜单项执行操作。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/shared/ContextMenu.tsx packages/web/tests/shared/ContextMenu.test.tsx
git commit -m "feat: add context menu for notes and folders using Radix UI"
```

---

## Task 39: 搜索界面

**Files:**

- Create: `packages/web/src/hooks/useSearch.ts`
- Create: `packages/web/src/components/shared/SearchBar.tsx`
- Create: `packages/web/src/components/shared/SearchFilterPanel.tsx`
- Create: `packages/web/src/components/shared/SearchResultList.tsx`
- Create: `packages/web/src/hooks/index.ts` (更新导出)
- Create: `packages/web/tests/hooks/useSearch.test.ts`
- Create: `packages/web/tests/shared/SearchBar.test.tsx`
- Create: `packages/web/tests/shared/SearchFilterPanel.test.tsx`
- Create: `packages/web/tests/shared/SearchResultList.test.tsx`

搜索界面包含搜索栏 + 可展开的筛选面板 + 结果列表。使用 StorageAdapter.searchNotes(SearchInput) 进行多维度组合查询。

- [ ] **Step 1: 编写 useSearch.ts**

```typescript
// packages/web/src/hooks/useSearch.ts
import { useState, useCallback } from "react";
import { getStorage } from "../lib/sqlite-init";
import { useNotesStore, useTagsStore, useFoldersStore } from "../stores";
import type { SearchInput, SearchResult, TagFilterMode } from "@notes/core";

export function useSearch() {
  const [searchInput, setSearchInput] = useState<SearchInput>({});
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const setSearchResult = useNotesStore((s) => s.setSearchResult);
  const tags = useTagsStore((s) => s.tags);
  const folders = useFoldersStore((s) => s.folders);

  const executeSearch = useCallback(
    async (input: SearchInput) => {
      setLoading(true);
      try {
        const storage = getStorage();
        const searchResult = await storage.searchNotes(input);
        setResult(searchResult);
        setSearchResult(searchResult);
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [setSearchResult],
  );

  const updateFilter = useCallback(
    (partial: Partial<SearchInput>) => {
      const newInput = { ...searchInput, ...partial };
      setSearchInput(newInput);
      if (
        newInput.query ||
        newInput.folderId ||
        newInput.tagIds?.length ||
        newInput.type ||
        newInput.hasAttachment ||
        newInput.dateRange
      ) {
        executeSearch(newInput);
      }
    },
    [searchInput, executeSearch],
  );

  const clearSearch = useCallback(() => {
    setSearchInput({});
    setResult(null);
    setSearchResult(null);
  }, [setSearchResult]);

  return { searchInput, result, loading, executeSearch, updateFilter, clearSearch, tags, folders };
}
```

- [ ] **Step 2: 编写 SearchBar.tsx**

```typescript
// packages/web/src/components/shared/SearchBar.tsx
// 输入框 + 搜索图标 + 清除按钮
// 输入时 debounce 300ms → updateFilter({ query })
// 搜索框下方展开/折叠按钮 → 显示 SearchFilterPanel
```

- [ ] **Step 3: 编写 SearchFilterPanel.tsx**

```typescript
// packages/web/src/components/shared/SearchFilterPanel.tsx
// 可展开的筛选面板：
// 1. 文件夹下拉单选（文件夹列表 + "全部"）
// 2. 标签多选器（选择多个标签 + 交集/并集切换）
// 3. 时间范围选择器（创建/更新 + 日期区间）
// 4. 笔记类型下拉（text/markdown/rich）
// 5. 附件类型筛选（image/video/audio/file）
// 每个筛选维度变更时 → updateFilter(partial)
```

- [ ] **Step 4: 编写 SearchResultList.tsx**

```typescript
// packages/web/src/components/shared/SearchResultList.tsx
// 搜索结果列表，每个结果：
// - 标题（关键词高亮）
// - 更新时间
// - 匹配维度标注（标题/内容/标签）
// - 标签徽章
// 点击 → 打开笔记详情
// 底部"加载更多"按钮（hasMore → offset + limit）
```

- [ ] **Step 5: 更新 hooks/index.ts**

添加 `export { useSearch } from "./useSearch";` 和 `export { useTheme } from "./useTheme";`

- [ ] **Step 6: 编写 useSearch.test.ts**

测试：搜索执行、筛选条件更新、结果更新、清除搜索。

- [ ] **Step 7: 编写 SearchBar.test.tsx**

测试：输入框渲染、输入触发搜索、清除按钮、展开筛选面板按钮。

- [ ] **Step 8: 编写 SearchFilterPanel.test.tsx**

测试：文件夹下拉、标签多选、时间范围、类型筛选、筛选条件变更。

- [ ] **Step 9: 编写 SearchResultList.test.tsx**

测试：结果渲染、关键词高亮、点击打开笔记、"加载更多"。

- [ ] **Step 10: Commit**

```bash
git add packages/web/src/hooks/useSearch.ts packages/web/src/hooks/useTheme.ts packages/web/src/hooks/index.ts packages/web/src/components/shared/SearchBar.tsx packages/web/src/components/shared/SearchFilterPanel.tsx packages/web/src/components/shared/SearchResultList.tsx packages/web/tests/hooks/useSearch.test.ts packages/web/tests/shared/SearchBar.test.tsx packages/web/tests/shared/SearchFilterPanel.test.tsx packages/web/tests/shared/SearchResultList.test.tsx
git commit -m "feat: add search UI with multi-dimensional filter panel and result list"
```

---

## Task 40: 侧栏重构（双栏聚焦设计 — 下拉覆盖层 + 笔记列表 + 搜索）

**Files:**

- Modify: `packages/web/src/components/desktop/Sidebar.tsx`

重构 Sidebar 为**双栏聚焦**设计（符合设计规格），而非三栏。文件夹树以**下拉覆盖层**形式展示，不永久占据侧栏空间，释放更多写作区域。

- [ ] **Step 1: 重构 Sidebar.tsx**

```typescript
// packages/web/src/components/desktop/Sidebar.tsx
// 双栏聚焦布局（320px 宽度，可折叠到 0px）：
//
// 顶部区域：
//   1. FolderTreeDropdown（文件夹下拉覆盖层）— 点击"文件夹"按钮弹出，选中后收起
//   2. SearchBar（搜索框 + 可展开筛选面板）
//
// 中间区域：笔记列表
//   3. 虚拟滚动笔记列表（使用 @tanstack/react-virtual）
//   4. 当前文件夹/标签筛选后的笔记
//   5. 标签筛选器（横向标签按钮，点击切换筛选）
//   6. 笔记卡片支持 ContextMenu 右键操作
//
// 底部区域：
//   7. ThemeToggle（暗色/亮色切换）
//   8. 侧栏折叠/展开按钮
```

> **设计规格对齐：** 设计规格明确说"比三栏更简洁，写作空间更专注。文件夹树以下拉覆盖层形式展示。"此前原方案将 FolderTree 永久嵌入侧栏，不符合设计意图。新方案使用 FolderTreeDropdown（Radix Popover），选中文件夹后下拉自动收起，保持双栏聚焦。

- [ ] **Step 2: 编写 Sidebar.test.tsx**

测试：FolderTreeDropdown 下拉覆盖层、SearchBar 搜索、笔记列表渲染、标签筛选、侧栏折叠、ThemeToggle。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/desktop/Sidebar.tsx packages/web/tests/desktop/Sidebar.test.tsx
git commit -m "feat: refactor Sidebar with folder tree, search bar, and tag filter"
```

---

## Task 41: 移动端搜索和设置页面

**Files:**

- Create: `packages/web/src/components/mobile/MobileSearch.tsx`
- Create: `packages/web/src/components/mobile/MobileSettings.tsx`
- Create: `packages/web/src/components/mobile/MobileDrawer.tsx`
- Create: `packages/web/src/components/mobile/MobileFAB.tsx`
- Create: `packages/web/tests/mobile/MobileSearch.test.tsx`
- Create: `packages/web/tests/mobile/MobileSettings.test.tsx`
- Create: `packages/web/tests/mobile/MobileDrawer.test.tsx`
- Create: `packages/web/tests/mobile/MobileFAB.test.tsx`

移动端需要独立的搜索页面、设置页面、抽屉导航和浮动操作按钮。

- [ ] **Step 1: 编写 MobileSearch.tsx**

```typescript
// packages/web/src/components/mobile/MobileSearch.tsx
// 搜索页面：
// - SearchBar + SearchFilterPanel（全屏展开）
// - SearchResultList
// - 底部返回按钮
```

- [ ] **Step 2: 编写 MobileSettings.tsx**

```typescript
// packages/web/src/components/mobile/MobileSettings.tsx
// 设置页面：
// - ThemeToggle（暗色/亮色）
// - 编辑器模式选择（WYSIWYG / Markdown 默认）
// - 数据管理（导出/导入按钮 — P5 实现具体功能，此处为 UI 占位）
// - 关于信息
```

- [ ] **Step 3: 编写 MobileDrawer.tsx**

```typescript
// packages/web/src/components/mobile/MobileDrawer.tsx
// 使用 Radix Dialog 作为抽屉：
// - 左侧滑出
// - FolderTree 导航
// - 标签列表（点击标签筛选笔记）
// - 关闭按钮
```

- [ ] **Step 4: 编写 MobileFAB.tsx**

```typescript
// packages/web/src/components/mobile/MobileFAB.tsx
// 浮动操作按钮（右下角）：
// - 新建笔记 → 切换到 NoteView
// - 上传图片/视频 → 触发文件选择器
```

- [ ] **Step 5: 编写四个测试文件**

MobileSearch.test.tsx, MobileSettings.test.tsx, MobileDrawer.test.tsx, MobileFAB.test.tsx

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/mobile/MobileSearch.tsx packages/web/src/components/mobile/MobileSettings.tsx packages/web/src/components/mobile/MobileDrawer.tsx packages/web/src/components/mobile/MobileFAB.tsx packages/web/tests/mobile/
git commit -m "feat: add mobile search, settings, drawer, and FAB components"
```

---

## Task 42: 更新 MobileLayout 连接搜索和设置

**Files:**

- Modify: `packages/web/src/components/layouts/MobileLayout.tsx`

将 MobileLayout 中占位的"搜索"和"设置"按钮连接到实际页面。

- [ ] **Step 1: 更新 MobileLayout.tsx**

底部导航的"搜索" → `showSearch` state → 渲染 `MobileSearch`
底部导航的"设置" → `showSettings` state → 渲染 `MobileSettings`
添加 `MobileFAB` 在右下角
添加 `MobileDrawer` 在左侧（汉堡按钮触发）

四屏状态：`quickNote` | `noteList` | `search` | `settings` + `noteView`（覆盖）

- [ ] **Step 2: 更新 MobileLayout.test.tsx**

测试：搜索页面导航、设置页面导航、FAB 渲染、抽屉导航。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/layouts/MobileLayout.tsx packages/web/tests/layouts/MobileLayout.test.tsx
git commit -m "feat: connect mobile search and settings pages in MobileLayout"
```

---

## Task 43: 更新 DesktopLayout 侧栏折叠

**Files:**

- Modify: `packages/web/src/components/layouts/DesktopLayout.tsx`

DesktopLayout 支持侧栏折叠/展开，优化窄屏体验。

- [ ] **Step 1: 更新 DesktopLayout.tsx**

添加侧栏折叠按钮（`sidebarOpen` 状态控制）：

- 折叠时：侧栏宽度 0px，主区域占满
- 展开时：侧栏 320px，主区域自适应
- 折叠按钮在主区域左上角
- transition 动画

- [ ] **Step 2: 更新 DesktopLayout.test.tsx**

测试：侧栏折叠/展开、折叠按钮渲染、主区域宽度调整。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/layouts/DesktopLayout.tsx packages/web/tests/layouts/DesktopLayout.test.tsx
git commit -m "feat: add sidebar collapsible toggle in DesktopLayout"
```

---

## Task 44: TipTap TaskList / Table / CodeBlockLowlight 扩展

**Files:**

- Create: `packages/web/src/lib/highlight-languages.ts`
- Modify: `packages/web/src/lib/tiptap-setup.ts`
- Modify: `packages/web/src/components/shared/EditorToolbar.tsx`
- Modify: `packages/web/src/styles/globals.css`
- Create: `packages/web/tests/lib/highlight-languages.test.ts`

注册 TaskList、Table、CodeBlockLowlight 扩展到编辑器，添加对应的 toolbar 按钮和样式。

- [ ] **Step 1: 编写 highlight-languages.ts**

配置 lowlight 常用语言：

```typescript
// packages/web/src/lib/highlight-languages.ts
import { common, createLowlight } from "lowlight";

export const lowlight = createLowlight(common);

// 常用语言列表（用于斜杠命令和 toolbar 提示）
export const HIGHLIGHT_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
  "bash",
  "sql",
  "xml",
  "ruby",
  "php",
];
```

- [ ] **Step 2: 更新 tiptap-setup.ts**

在 `getEditorExtensions` 中添加 TaskList、Table、CodeBlockLowlight、HorizontalRule：

```typescript
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { lowlight } from "./highlight-languages";

// 在 extensions 数组中添加：
TaskList,
TaskItem.configure({ nested: true }),
Table.configure({ resizable: true }),
TableRow,
TableCell,
TableHeader,
CodeBlockLowlight.configure({ lowlight }),
HorizontalRule,
```

同时更新斜杠命令面板的 `SlashCommandItems`，添加：

- "任务列表" → toggleTaskList
- "表格" → insertTable({ rows: 3, cols: 3, withHeaderRow: true })
- "代码块" → toggleCodeBlock (已有，但更新描述为"带语法高亮")
- "分割线" → setHorizontalRule (已有)

- [ ] **Step 3: 更新 EditorToolbar.tsx**

添加新按钮：

- 任务列表按钮 ☑
- 表格按钮 ⊞
- 代码块按钮 (带语言选择下拉)

- [ ] **Step 4: 更新 globals.css 样式**

添加任务列表、表格、代码高亮样式：

```css
/* 任务列表 */
.ProseMirror ul[data-type="task-list"] {
  list-style: none;
  padding-left: 0;
}
.ProseMirror ul[data-type="task-list"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.ProseMirror ul[data-type="task-list"] li label input[type="checkbox"] {
  accent-color: var(--accent);
}

/* 表格 */
.ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}
.ProseMirror table td,
.ProseMirror table th {
  border: 1px solid var(--border-color);
  padding: 0.5rem;
  min-width: 80px;
}
.ProseMirror table th {
  background: var(--bg-tertiary);
  font-weight: 600;
}
.ProseMirror table .selectedCell {
  background: rgba(59, 130, 246, 0.1);
}

/* 代码块语法高亮 */
.ProseMirror pre code .hljs-keyword {
  color: #c678dd;
}
.ProseMirror pre code .hljs-string {
  color: #98c379;
}
.ProseMirror pre code .hljs-number {
  color: #d19a66;
}
.ProseMirror pre code .hljs-comment {
  color: #5c6370;
  font-style: italic;
}
.ProseMirror pre code .hljs-function {
  color: #61afef;
}
.ProseMirror pre code .hljs-title {
  color: #61afef;
}
.ProseMirror pre code .hljs-type {
  color: #e5c07b;
}
.ProseMirror pre code .hljs-built_in {
  color: #e5c07b;
}
.ProseMirror pre code .hljs-variable {
  color: #e06c75;
}
.ProseMirror pre code .hljs-attr {
  color: #d19a66;
}

.dark .ProseMirror pre code .hljs-keyword {
  color: #c678dd;
}
.dark .ProseMirror pre code .hljs-string {
  color: #98c379;
}
.dark .ProseMirror pre code .hljs-comment {
  color: #5c6370;
}
```

- [ ] **Step 5: 编写 highlight-languages.test.ts**

测试：lowlight 创建、语言列表、代码片段高亮解析。

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/lib/highlight-languages.ts packages/web/src/lib/tiptap-setup.ts packages/web/src/lib/SlashCommand.ts packages/web/src/components/shared/EditorToolbar.tsx packages/web/src/styles/globals.css packages/web/tests/lib/highlight-languages.test.ts
git commit -m "feat: add TaskList, Table, CodeBlockLowlight extensions with syntax highlighting"
```

---

## Task 45: Markdown 序列器更新（支持 TaskList/Table/CodeBlock）

**Files:**

- Modify: `packages/web/src/lib/markdown-serializer.ts`
- Modify: `packages/web/tests/lib/markdown-serializer.test.ts`

Markdown 序列器需要处理任务列表 (`- [x] ...` / `- [ ] ...`)、表格 (`| col | col |`) 和代码块 (```lang) 的双向转换。

- [ ] **Step 1: 更新 markdownToProseMirrorJSON**

ProseMirror JSON 中 `taskList` + `taskItem` 节点 → Markdown `- [x]` / `- [ ]`
`table` + `tableRow` + `tableCell` 节点 → Markdown 表格格式
`codeBlock` 节点（含 language 属性）→ Markdown ```lang 格式

由于 `prosemirror-markdown` 默认解析器不支持这些扩展节点，需要添加自定义解析规则：

- 任务列表：`- [x]` → taskItem(checked=true), `- [ ]` → taskItem(checked=false)
- 表格：使用正则匹配 `| ... |` 行
- 代码块：```lang → codeBlock(language=lang)

- [ ] **Step 2: 更新 proseMirrorJSONToMarkdown**

序列化时处理：

- `taskList` → 无序列表语法，每个 `taskItem` 带 `[x]` 或 `[ ]`
- `table` → Markdown 表格语法
- `codeBlock` → ```lang 格式

- [ ] **Step 3: 更新 markdown-serializer.test.ts**

添加测试：包含任务列表的 Markdown 双向转换、表格的双向转换、代码块的语言属性保留。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/markdown-serializer.ts packages/web/tests/lib/markdown-serializer.test.ts
git commit -m "feat: update markdown serializer to support TaskList, Table, CodeBlock"
```

---

## Task 46: NoteView 标签管理和右键菜单集成

**Files:**

- Modify: `packages/web/src/components/NoteView.tsx`
- Modify: `packages/web/tests/shared/NoteView.test.tsx`

在 NoteView 中集成 TagSelector 和 ContextMenu。

- [ ] **Step 1: 更新 NoteView.tsx**

添加标签管理区域：

- 在笔记标题下方显示已有标签（TagBadge removable）
- "添加标签"按钮 → 打开 TagSelector
- 笔记区域支持 ContextMenu 右键操作

- [ ] **Step 2: 更新 NoteView.test.tsx**

测试：标签显示、添加标签、移除标签、右键菜单。

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/NoteView.tsx packages/web/tests/shared/NoteView.test.tsx
git commit -m "feat: add tag management and context menu to NoteView"
```

---

## Task 47: 搜索和文件夹树样式补充

**Files:**

- Modify: `packages/web/src/styles/globals.css`

补充搜索界面、文件夹树、抽屉、FAB 等新组件的样式。

- [ ] **Step 1: 添加样式到 globals.css**

```css
/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: var(--bg-tertiary);
}

.search-bar input {
  width: 100%;
  padding: 0.5rem;
  border: none;
  background: transparent;
  color: var(--text-primary);
}

/* 搜索筛选面板 */
.search-filter-panel {
  padding: 0.75rem;
  border-top: 1px solid var(--border-color);
}

/* 搜索结果高亮 */
.search-highlight {
  background: rgba(59, 130, 246, 0.2);
  border-radius: 0.125rem;
  padding: 0 0.125rem;
}

/* 文件夹树 */
.folder-tree-node {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  border-radius: 0.25rem;
}

.folder-tree-node:hover {
  background: var(--hover-bg);
}

.folder-tree-node.selected {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent);
}

.folder-tree-node .expand-btn {
  width: 1rem;
  text-align: center;
  font-size: 0.75rem;
}

/* 主题切换按钮 */
.theme-toggle {
  padding: 0.25rem;
  border-radius: 0.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.25rem;
}

.theme-toggle:hover {
  background: var(--hover-bg);
}

/* 移动端 FAB */
.mobile-fab {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 50;
}

/* 移动端抽屉 */
.mobile-drawer {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: var(--sidebar-bg);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 60;
}

.mobile-drawer.open {
  transform: translateX(0);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/styles/globals.css
git commit -m "feat: add styles for search, folder tree, theme toggle, mobile FAB and drawer"
```

---

## Task 48: DOMPurify XSS 防护集成

**Files:**

- Create: `packages/web/src/lib/dompurify-setup.ts`
- Create: `packages/web/tests/lib/dompurify-setup.test.ts`
- Modify: `packages/web/src/components/shared/MarkdownEditor.tsx`

设计规格明确要求"DOMPurify 对所有渲染的 Markdown 内容进行消毒"，防止 XSS 攻击。

- [ ] **Step 1: 编写 dompurify-setup.ts**

```typescript
// packages/web/src/lib/dompurify-setup.ts
import DOMPurify from "dompurify";

// 配置 DOMPurify：允许安全的 HTML 标签和属性
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  // 保留 attachment:// 协议的 src 属性
  if (node.tagName === "IMG" || node.tagName === "VIDEO") {
    const src = node.getAttribute("src");
    if (src && src.startsWith("attachment://")) {
      node.setAttribute("src", src);
    }
  }
});

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "br",
      "hr",
      "strong",
      "em",
      "u",
      "s",
      "code",
      "pre",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "video",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "input",
      "label",
      "div",
      "span",
    ],
    ALLOWED_ATTR: [
      "href",
      "src",
      "alt",
      "title",
      "class",
      "id",
      "type",
      "checked",
      "controls",
      "loading",
      "colspan",
      "rowspan",
      "width",
      "height",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
```

- [ ] **Step 2: 在 MarkdownEditor.tsx 中集成 DOMPurify**

所有从 Markdown 转换的 HTML 内容在渲染前都需经过 `sanitizeHtml` 处理。

- [ ] **Step 3: 编写 dompurify-setup.test.ts**

测试：XSS script 标签过滤、attachment:// src 保留、危险属性（onclick 等）移除、合法 HTML 标签保留。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/dompurify-setup.ts packages/web/src/components/shared/MarkdownEditor.tsx packages/web/tests/lib/dompurify-setup.test.ts
git commit -m "feat: add DOMPurify XSS protection for Markdown rendering"
```

---

## Task 49: 回收站 UI

**Files:**

- Create: `packages/web/src/components/shared/TrashView.tsx`
- Modify: `packages/web/src/stores/notesStore.ts`
- Modify: `packages/web/src/stores/uiStore.ts`
- Create: `packages/web/tests/shared/TrashView.test.tsx`

设计规格要求"软删除 + 30 天回收站。仅从回收站可彻底删除。"当前 StorageAdapter 支持 `includeDeleted` 搜索参数，但缺少回收站 UI 入口和恢复/彻底删除操作。

- [ ] **Step 1: 更新 notesStore.ts 增加回收站方法**

```typescript
// notesStore.ts 新增：
// deletedNotes: Note[]  — 回收站笔记列表
// setDeletedNotes: (notes: Note[]) => void
// restoreNote: (id: string) => Promise<void>  — 恢复笔记（deleted_at = null）
// permanentlyDeleteNote: (id: string) => Promise<void>  — 彻底删除
// loadDeletedNotes: () => Promise<void>  — 加载回收站笔记
```

- [ ] **Step 2: 更新 uiStore.ts 添加回收站入口**

```typescript
// uiStore.ts 新增：
// showTrash: boolean  — 是否显示回收站视图
// setShowTrash: (show: boolean) => void
```

- [ ] **Step 3: 编写 TrashView.tsx**

```typescript
// packages/web/src/components/shared/TrashView.tsx
// 回收站页面：
// 1. 标题："回收站" + 关闭按钮
// 2. 软删除笔记列表（按 deleted_at 降序）
// 3. 每条笔记显示：标题、删除时间、"恢复"按钮、"彻底删除"按钮
// 4. "彻底删除"操作前弹出 ConfirmDialog 确认
// 5. 底部："清空回收站"按钮（需二次确认）
// 6. 空回收站时显示空状态提示
```

- [ ] **Step 4: 在侧栏/导航中添加回收站入口**

桌面端 Sidebar 底部添加"回收站"按钮 → `setShowTrash(true)`。
移动端 MobileDrawer 或 MobileSettings 添加"回收站"入口。

- [ ] **Step 5: 编写 TrashView.test.tsx**

测试：回收站列表渲染、恢复笔记、彻底删除（确认对话框）、清空回收站、空状态。

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/shared/TrashView.tsx packages/web/src/stores/notesStore.ts packages/web/src/stores/uiStore.ts packages/web/src/components/desktop/Sidebar.tsx packages/web/tests/shared/TrashView.test.tsx
git commit -m "feat: add trash/recycle bin UI with restore and permanent delete"
```

---

## Task 50: 确认对话框、重命名对话框、移动笔记对话框

**Files:**

- Create: `packages/web/src/components/shared/ConfirmDialog.tsx`
- Create: `packages/web/src/components/shared/RenameDialog.tsx`
- Create: `packages/web/src/components/shared/MoveNoteDialog.tsx`
- Create: `packages/web/tests/shared/ConfirmDialog.test.tsx`
- Create: `packages/web/tests/shared/RenameDialog.test.tsx`
- Create: `packages/web/tests/shared/MoveNoteDialog.test.tsx`
- Modify: `packages/web/src/components/shared/ContextMenu.tsx`

ContextMenu 提供"删除"、"重命名"、"移动到文件夹"操作，但缺少对应的对话框 UI。删除操作尤其需要确认以防误操作。

- [ ] **Step 1: 编写 ConfirmDialog.tsx**

使用 Radix UI AlertDialog：

```typescript
// packages/web/src/components/shared/ConfirmDialog.tsx
// Radix AlertDialog.Root + Trigger + Content
// Props: open, onOpenChange, title, description, confirmLabel, onConfirm, variant ("danger" | "default")
// "danger" variant: 确认按钮红色，用于删除操作
// "default" variant: 确认按钮蓝色，用于一般确认
```

- [ ] **Step 2: 编写 RenameDialog.tsx**

```typescript
// packages/web/src/components/shared/RenameDialog.tsx
// Radix Dialog + input（当前名称作为初始值）
// Props: open, onOpenChange, currentName, onRename
// 输入框自动聚焦，Enter 确认，Escape 取消
```

- [ ] **Step 3: 编写 MoveNoteDialog.tsx**

```typescript
// packages/web/src/components/shared/MoveNoteDialog.tsx
// Radix Dialog + 文件夹树选择器（FolderTree 组件嵌入）
// Props: open, onOpenChange, noteId, currentFolderId, onMove
// 显示当前文件夹位置，选择目标文件夹后确认移动
```

- [ ] **Step 4: 更新 ContextMenu.tsx 集成对话框**

ContextMenu 的操作现在连接到实际对话框：

- "删除" → 打开 ConfirmDialog（variant=danger）
- "重命名" → 打开 RenameDialog
- "移动到文件夹" → 打开 MoveNoteDialog

- [ ] **Step 5: 编写三个测试文件**

测试各自对话框的打开/关闭、操作执行、取消操作。

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/shared/ConfirmDialog.tsx packages/web/src/components/shared/RenameDialog.tsx packages/web/src/components/shared/MoveNoteDialog.tsx packages/web/src/components/shared/ContextMenu.tsx packages/web/tests/shared/ConfirmDialog.test.tsx packages/web/tests/shared/RenameDialog.test.tsx packages/web/tests/shared/MoveNoteDialog.test.tsx
git commit -m "feat: add ConfirmDialog, RenameDialog, MoveNoteDialog with ContextMenu integration"
```

---

## Task 51: 数据完整性校验 UI

**Files:**

- Create: `packages/web/src/hooks/useAttachmentIntegrity.ts`
- Create: `packages/web/src/components/shared/AttachmentIntegrityBanner.tsx`
- Modify: `packages/web/src/App.tsx`
- Create: `packages/web/tests/hooks/useAttachmentIntegrity.test.ts`
- Create: `packages/web/tests/shared/AttachmentIntegrityBanner.test.tsx`

设计规格要求"启动时完整性校验：验证每个附件 ID 有对应 IndexedDB Blob。UI 中标记缺失项。"

- [ ] **Step 1: 编写 useAttachmentIntegrity.ts**

```typescript
// packages/web/src/hooks/useAttachmentIntegrity.ts
import { useState, useEffect } from "react";
import { getStorage } from "../lib/sqlite-init";

interface IntegrityResult {
  missingAttachments: string[]; // 附件 ID 列表（有 SQLite 记录但无 IndexedDB Blob）
  checked: boolean;
}

export function useAttachmentIntegrity() {
  const [result, setResult] = useState<IntegrityResult>({ missingAttachments: [], checked: false });

  useEffect(() => {
    const checkIntegrity = async () => {
      try {
        const storage = getStorage();
        // 1. 从 SQLite 获取所有附件 ID 列表
        // 2. 对每个 ID 检查 IndexedDB 是否有对应 Blob
        // 3. 收集缺失的附件 ID
        setResult({ missingAttachments: [], checked: true });
      } catch {
        setResult({ missingAttachments: [], checked: true });
      }
    };

    checkIntegrity();
  }, []);

  return result;
}
```

- [ ] **Step 2: 编写 AttachmentIntegrityBanner.tsx**

```typescript
// packages/web/src/components/shared/AttachmentIntegrityBanner.tsx
// 如果有缺失附件，显示顶部警告条：
// "部分附件文件丢失（N 个），可能影响图片/视频显示。"
// 点击可查看详情或忽略
```

- [ ] **Step 3: 在 App.tsx 中调用完整性校验**

初始化完成后调用 `useAttachmentIntegrity()`，当发现缺失附件时显示 `AttachmentIntegrityBanner`。

- [ ] **Step 4: 编写测试**

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useAttachmentIntegrity.ts packages/web/src/components/shared/AttachmentIntegrityBanner.tsx packages/web/src/App.tsx packages/web/tests/hooks/useAttachmentIntegrity.test.ts packages/web/tests/shared/AttachmentIntegrityBanner.test.tsx
git commit -m "feat: add attachment integrity check on startup with warning banner"
```

---

## Task 52: SharedWorker 单写锁封装

**Files:**

- Create: `packages/web/src/lib/sqlite-shared-worker.ts`
- Modify: `packages/web/src/lib/sqlite-init.ts`
- Create: `packages/web/tests/lib/sqlite-shared-worker.test.ts`

设计规格要求"使用 SharedWorker 管理唯一的 wa-sqlite 数据库连接。所有标签页通过 SharedWorker 发送操作。" P0-P1 计划标注"P4+ 实施时补充"。当前直接连接模式在多标签页场景下可能导致 SQLite 单写冲突。

- [ ] **Step 1: 编写 sqlite-shared-worker.ts**

```typescript
// packages/web/src/lib/sqlite-shared-worker.ts
// SharedWorker 封装：
// 1. SharedWorker 持有唯一的 wa-sqlite 数据库连接和单写锁
// 2. 所有标签页通过 postMessage 发送 SQL 操作请求
// 3. SharedWorker 按序列化顺序执行写操作，读操作可并发
// 4. 操作结果通过 postMessage 返回给请求标签页
// 5. 广播通知（BroadcastChannel）用于标签页间数据变更通知
//
// 降级策略：
// - SharedWorker 不可用时（部分移动浏览器），回退到 BroadcastChannel 协调
// - BroadcastChannel 使用建议性锁（非强制），多标签页写入仍有极小概率冲突
```

- [ ] **Step 2: 更新 sqlite-init.ts**

```typescript
// sqlite-init.ts 重构：
// 1. 优先尝试创建 SharedWorker 连接
// 2. SharedWorker 连接成功 → 使用 SharedWorker 模式
// 3. SharedWorker 不可用 → 回退到直接连接模式（当前实现）
// 4. 两种模式的 initStorage/getStorage/closeStorage API 保持一致
```

- [ ] **Step 3: 编写 sqlite-shared-worker.test.ts**

测试：SharedWorker 连接创建、SQL 操作序列化执行、写锁互斥、降级到直接连接模式。

> **注意：** SharedWorker 在 vitest 测试环境中可能不可用，需要 mock SharedWorker 构造函数。

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/sqlite-shared-worker.ts packages/web/src/lib/sqlite-init.ts packages/web/tests/lib/sqlite-shared-worker.test.ts
git commit -m "feat: add SharedWorker single-write-lock for multi-tab SQLite coordination"
```

---

## Task 53: QuickNote / NoteListMobile / MarkdownEditor 更新

**Files:**

- Modify: `packages/web/src/components/QuickNote.tsx`
- Modify: `packages/web/src/components/mobile/NoteListMobile.tsx`
- Modify: `packages/web/src/components/shared/MarkdownEditor.tsx`

QuickNote 是设计规格的核心首屏体验，但 P4 未更新它以集成新功能。NoteListMobile 需支持标签/文件夹筛选。MarkdownEditor 需支持 P4 新增的 TaskList/Table/CodeBlock 节点。

- [ ] **Step 1: 更新 QuickNote.tsx**

```typescript
// QuickNote.tsx 增强：
// 1. 快速笔记下方：标签筛选按钮（横向标签列表，点击切换）
// 2. 搜索入口按钮 → 跳转到 SearchBar
// 3. 笔记卡片显示缩略图（P3 useThumbnailRenderer）
// 4. 笔记卡片支持标签徽章（TagBadge）
```

- [ ] **Step 2: 更新 NoteListMobile.tsx**

```typescript
// NoteListMobile.tsx 增强：
// 1. 顶部标签筛选按钮（横向）
// 2. 文件夹筛选入口（点击打开 MobileDrawer）
// 3. 虚拟滚动（使用 @tanstack/react-virtual）
```

- [ ] **Step 3: 更新 MarkdownEditor.tsx**

````typescript
// MarkdownEditor.tsx 增强：
// 1. Markdown 源码模式下，TaskList 渲染为 - [x] / - [ ]
// 2. Table 渲染为 | col | col | 表格格式
// 3. CodeBlock 渲染为 ```lang 格式
// 4. 所有 HTML 渲染经过 DOMPurify sanitizeHtml 处理（Task 48）
````

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/QuickNote.tsx packages/web/src/components/mobile/NoteListMobile.tsx packages/web/src/components/shared/MarkdownEditor.tsx
git commit -m "feat: update QuickNote, NoteListMobile, MarkdownEditor with P4 features"
```

---

## Task 54: CSS 变量全面替换、touch-action、visualViewport

**Files:**

- Modify: `packages/web/src/styles/globals.css`
- Modify: `packages/web/src/hooks/useResponsive.ts`

Task 35 添加了暗色主题 CSS 变量，但未全面替换现有硬编码颜色。还需补充 touch-action 和 visualViewport 监听。

- [ ] **Step 1: 全面替换 globals.css 硬编码颜色**

将 globals.css 中所有硬编码颜色值（如 `#f1f5f9`、`#64748b`、`#3b82f6`、`#ef4444` 等）替换为对应的 CSS 变量（`var(--bg-tertiary)`、`var(--text-secondary)`、`var(--accent)`、`var(--danger)` 等），确保暗色主题生效完整。

需逐一检查的硬编码颜色位置：

- ProseMirror 编辑器相关样式
- 侧栏/布局样式
- 笔记卡片样式
- 标签徽章样式
- 回收站样式
- Toast 样式

- [ ] **Step 2: 添加 touch-action: manipulation**

```css
/* globals.css 添加 */
body {
  touch-action: manipulation; /* 消除移动端 300ms 点击延迟 */
}
```

- [ ] **Step 3: 更新 useResponsive.ts 添加 visualViewport 监听**

```typescript
// useResponsive.ts 增强：
// 1. 监听 visualViewport resize 事件
// 2. 当虚拟键盘弹出时（visualViewport.height 显著小于 window.innerHeight）
// 3. 设置 isKeyboardVisible = true
// 4. 组件（如 Editor、NoteView）据此调整编辑区高度
// 5. 返回 { isMobile, isTablet, isDesktop, isKeyboardVisible }
```

- [ ] **Step 4: 更新 Radix ContextMenu 触摸适配**

ContextMenu 已在 Task 38 创建。补充触摸适配说明：

- Radix UI ContextMenu 默认支持触摸长按触发
- `@use-gesture/react` 可用于自定义长按手势阈值（>500ms 触发右键菜单）

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/styles/globals.css packages/web/src/hooks/useResponsive.ts
git commit -m "feat: replace all hardcoded colors with CSS variables, add touch-action and visualViewport"
```

---

## Task 55: 综合测试与验证

**Files:**

- 修改各类测试文件以覆盖 P4 新功能

- [ ] **Step 1: 运行所有 core 测试**

```bash
pnpm --filter @notes/core test
```

- [ ] **Step 2: 运行所有 web 测试**

```bash
pnpm --filter @notes/web test
```

- [ ] **Step 3: 启动 Web 应用进行浏览器验证**

启动应用 `pnpm --filter @notes/web dev`，测试：

**桌面端验证：**

1. 侧栏文件夹下拉覆盖层 → 点击按钮弹出 → 选中文件夹 → 自动收起 → 笔记列表更新
2. 新建文件夹 → 选择父文件夹 → 创建 → 下拉覆盖层更新
3. 搜索栏 → 输入关键词 → 结果列表 → 关键词高亮
4. 搜索筛选面板 → 文件夹/标签/时间筛选 → 组合查询
5. 右键菜单 → 删除笔记 → 确认对话框弹出 → 确认删除 → 笔记移除
6. 右键菜单 → 重命名 → 重命名对话框 → 输入新名称
7. 右键菜单 → 移动到文件夹 → 移动对话框 → 选择目标文件夹
8. 标签管理 → 为笔记添加标签 → 移除标签
9. 主题切换 → 暗色模式 → **所有组件 CSS 变量生效** → 侧栏折叠
10. 编辑器：任务列表 ☑ → 表格 ⊞ → 代码块语法高亮
11. 回收站 → 查看已删除笔记 → 恢复笔记 → 彻底删除（确认对话框）
12. 附件完整性校验 → 正常启动无提示 → 模拟缺失附件 → 显示警告条
13. QuickNote → 标签筛选 → 搜索入口 → 缩略图显示

**移动端验证：**

1. 底部导航 → 搜索页面 → 设置页面
2. 搜索 → 筛选 → 结果列表 → 点击笔记
3. 设置 → 主题切换
4. FAB → 新建笔记
5. 抽屉导航 → 文件夹树 → 选中文件夹
6. 长按 → 右键菜单（触摸适配）
7. 虚拟键盘弹出 → 编辑区高度自动调整
8. 回收站入口 → 恢复/彻底删除

**多标签页验证（SharedWorker）：**

1. 打开两个标签页 → 同一个笔记在两个标签页同时编辑
2. 标签页 A 保存 → 标签页 B 收到广播通知 → 内容更新
3. 标签页 A 写操作 → 标签页 B 写操作 → 无冲突

- [ ] **Step 4: 修复浏览器验证中发现的问题**

- [ ] **Step 5: 运行 Playwright E2E 测试**

```bash
pnpm --filter @notes/web exec playwright test
```

- [ ] **Step 6: 最终 Commit**

```bash
git add -A
git commit -m "feat: P4 complete UI experience - folder tree, search, tags, theme, task list, table, code highlighting, trash, SharedWorker, dialogs, integrity check"
```

---

## 实施顺序总结

| Task | 内容                                                                        | 依赖                                 |
| ---- | --------------------------------------------------------------------------- | ------------------------------------ |
| 34   | 安装 P4 新依赖（含 @use-gesture/react, @tanstack/react-virtual, dompurify） | 无                                   |
| 35   | 暗色/亮色主题系统                                                           | Task 34 (Radix)                      |
| 36   | 标签 Store + 管理 UI                                                        | Task 34 (Radix)                      |
| 37   | 文件夹树 + 下拉覆盖层 (FolderTreeDropdown)                                  | Task 34 (Radix)                      |
| 38   | 右键上下文菜单                                                              | Task 34 (Radix)                      |
| 39   | 搜索界面                                                                    | 无 (StorageAdapter 已有)             |
| 40   | 侧栏重构（双栏聚焦设计）                                                    | Task 37, 38, 39                      |
| 41   | 移动端搜索/设置/抽屉/FAB                                                    | Task 35, 36, 38                      |
| 42   | MobileLayout 连接                                                           | Task 41                              |
| 43   | DesktopLayout 侧栏折叠                                                      | Task 40                              |
| 44   | TaskList/Table/CodeBlockLowlight                                            | Task 34                              |
| 45   | Markdown 序列器更新                                                         | Task 44                              |
| 46   | NoteView 标签/右键菜单                                                      | Task 36, 38                          |
| 47   | 样式补充                                                                    | Task 35-44                           |
| 48   | DOMPurify XSS 防护                                                          | Task 34                              |
| 49   | 回收站 UI                                                                   | Task 36, 38 (ContextMenu)            |
| 50   | 确认/重命名/移动笔记对话框                                                  | Task 34 (Radix AlertDialog), Task 38 |
| 51   | 数据完整性校验 UI                                                           | 无                                   |
| 52   | SharedWorker 单写锁                                                         | 无 (独立于 UI)                       |
| 53   | QuickNote/NoteListMobile/MarkdownEditor 更新                                | Task 36, 44, 48                      |
| 54   | CSS 变量全面替换 + touch-action + visualViewport                            | Task 35, 47                          |
| 55   | 综合测试验证                                                                | 所有前置 Task                        |

**建议并行策略:**

- Task 34 先行（安装依赖）
- Task 35-39 + 48 + 51 + 52 可并行（主题、标签、文件夹、菜单、搜索、DOMPurify、完整性校验、SharedWorker 相互独立）
- Task 40-43 依赖前置组件，可分两组并行
- Task 44-45 编辑器扩展可独立推进
- Task 49-50 对话框组件依赖 ContextMenu（Task 38），可并行
- Task 53-54 在大部分组件完成后进行
