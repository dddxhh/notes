# 笔记应用 — 设计规格文档

**日期:** 2026-05-21
**状态:** 初稿 — 待用户审阅

## 概述

一款本地优先、跨平台的笔记应用，以响应式 Web 应用 + PWA 形式构建。支持文本、Markdown、图片和视频。数据存储在用户本地设备，后期可选云同步。可在桌面和移动浏览器中直接使用，无需安装原生应用。

## 设计决策（来自头脑风暴）

| 领域       | 决策                                                 | 理由                                                                                                                  |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 桌面端布局 | 双栏聚焦（Two-Column Focus）                         | 比三栏更简洁，写作空间更专注。文件夹树以下拉覆盖层形式展示。                                                          |
| 移动端布局 | 堆栈导航（Stack Push/Pop）                           | 经典 iOS 模式。点击笔记 → 推入编辑器。返回 → 弹出到列表。熟悉且可预测。                                               |
| 编辑器模式 | 智能混合切换（Hybrid Smart Mode）                    | 桌面端默认所见即所得（TipTap + 斜杠命令），移动端默认 Markdown 源码。两端均可切换。最适合各设备的交互习惯。           |
| 数据存储   | SQLite（wa-sqlite）存元数据 + IndexedDB 存二进制附件 | 职责分离清晰。SQLite 保持小体积查询快，IndexedDB 天然适合存图片/视频。                                                |
| 首屏体验   | 快速笔记优先（Quick Note First）                     | 零摩擦。用户立即看到输入框。标题从内容自动提取。下方展示最近笔记。                                                    |
| 平台       | 响应式 Web + PWA                                     | 一套代码覆盖桌面和移动浏览器。PWA 可"添加到主屏幕"。Capacitor 仅在需上架 App Store 时使用。                           |
| 前端框架   | React 18 + TypeScript                                | 编辑器生态最强（TipTap、Lexical 原生支持）。                                                                          |
| UI 组件库  | Radix UI + TailwindCSS                               | 无样式基础组件 + 工具类 CSS。灵活性最大，体积最小。                                                                   |
| 包管理器   | pnpm                                                 | 速度快、磁盘效率高、Monorepo 支持好。                                                                                 |
| 标签系统   | 可选 + 多选                                          | 笔记可不设标签（可选），也可设多个标签（多选）。通过 note_tags 多对多表实现。标签用于细粒度筛选，文件夹用于大类归类。 |
| 搜索       | FTS5 simple 分词器（基础版）                         | MVP 足够。精确的 jieba 中文分词搜索延后实现。                                                                         |

## 架构

### Monorepo 结构

```
notes/
├── turbo.json
├── package.json
├── tsconfig.base.json
├── .gitignore
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── models/          # Note、Folder、Attachment 类型定义
│   │       ├── storage/         # StorageAdapter 接口 + Web 实现
│   │       ├── search/          # FTS5 搜索逻辑
│   │       ├── sync/            # Yjs 同步引擎（未来）
│   │       └── utils/
│   │       └── index.ts
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── public/
│       │   ├── manifest.json    # PWA 配置
│       │   └── wasm/            # wa-sqlite WASM 文件
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/
│           │   ├── shared/       # Editor、NoteCard、SearchBar、TagBadge
│           │   ├── desktop/      # Sidebar、FolderTree、Toolbar
│           │   ├── mobile/       # MobileDrawer、MobileTabs、FAB
│           │   └── layouts/
│           │       ├── DesktopLayout.tsx
│           │       └── MobileLayout.tsx
│           ├── hooks/
│           │   ├── useResponsive.ts
│           │   ├── useNotes.ts
│           │   ├── useSearch.ts
│           │   └── useAutoSave.ts
│           ├── stores/
│           │   ├── notesStore.ts
│           │   ├── foldersStore.ts
│           │   └── uiStore.ts
│           ├── styles/
│           │   ├── globals.css
│           │   └── responsive.css
│           └── lib/
│               ├── sqlite.ts     # wa-sqlite 初始化
│               └── attachments.ts # IndexedDB 附件存储
│           └── index.css
│   └── sync-server/             # 可选（未来 Phase 6）
│       └── src/
│           ├── server.ts
│           ├── auth.ts
│           └── sync.ts
└── docs/
    └── superpowers/
        └── specs/
```

### 存储层

两个存储引擎，一个逻辑模型，通过统一的 `StorageAdapter` 接口访问。

**SQLite（Web 端用 wa-sqlite，桌面端用 better-sqlite3）：**

```sql
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,     -- TipTap ProseMirror JSON
  md_text TEXT NOT NULL,          -- Markdown 源码
  folder_id TEXT REFERENCES folders(id),
  type TEXT DEFAULT 'rich',      -- 'text' | 'markdown' | 'rich'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,             -- 软删除，null = 正常
  version INTEGER DEFAULT 1      -- 用于同步冲突检测
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,             -- 'image' | 'video' | 'audio' | 'file'
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- 标签系统说明：
-- 1. 标签是可选的：笔记可不设任何标签（folder_id 也是可选的）
-- 2. 标签支持多选：一条笔记可关联多个标签，通过 note_tags 多对多关系实现
-- 3. 标签用于细粒度筛选（如 #work、#idea），文件夹用于大类归类（如 Work、Personal）

-- FTS5 全文搜索
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, content,
  content='notes',
  content_rowid='rowid',
  tokenize='simple'
);
```

**IndexedDB（二进制文件存储）：**

```typescript
interface AttachmentStore {
  // 键: 附件 ID
  // 值: { data: Blob, thumbnail?: Blob }
}
```

`StorageAdapter` 接口隐藏双引擎细节：

```typescript
interface StorageAdapter {
  init(): Promise<void>;
  close(): Promise<void>;

  // 笔记
  createNote(input: CreateNoteInput): Promise<Note>;
  updateNote(id: string, input: UpdateNoteInput): Promise<Note>;
  deleteNote(id: string): Promise<void>; // 软删除
  getNote(id: string): Promise<Note | null>;
  listNotes(folderId?: string, tagId?: string): Promise<Note[]>;

  // 文件夹
  createFolder(input: CreateFolderInput): Promise<Folder>;
  updateFolder(id: string, input: UpdateFolderInput): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  listFolders(parentId?: string): Promise<Folder[]>;

  // 附件
  saveAttachment(noteId: string, file: File, type: AttachmentType): Promise<Attachment>;
  getAttachmentBlob(id: string): Promise<Blob | null>;
  getAttachmentThumbnail(id: string): Promise<Blob | null>;
  deleteAttachment(id: string): Promise<void>;

  // 搜索（多维度组合）
  searchNotes(input: SearchInput): Promise<SearchResult>;

  // 标签（可选、多选）
  createTag(name: string): Promise<Tag>;
  addTagToNote(noteId: string, tagId: string): Promise<void>;
  addTagsToNote(noteId: string, tagIds: string[]): Promise<void>; // 批量添加多个标签
  removeTagFromNote(noteId: string, tagId: string): Promise<void>;
  removeTagsFromNote(noteId: string, tagIds: string[]): Promise<void>; // 批量移除
  getTagsForNote(noteId: string): Promise<Tag[]>; // 获取笔记的所有标签
  listTags(): Promise<Tag[]>;
}
```

### 多标签页冲突解决

使用 `SharedWorker` 管理唯一的 wa-sqlite 数据库连接。所有标签页通过 SharedWorker 发送操作，SharedWorker 持有单写锁。这避免了 SQLite 单写约束在多标签页同时写入时引发冲突。

如果 `SharedWorker` 不可用（部分移动浏览器），降级为 `BroadcastChannel` 进行标签页间协调，使用建议性锁。

### 编辑器架构

**TipTap**（基于 ProseMirror）作为编辑器核心，以下扩展按阶段递增：

| 扩展                             | 阶段    | 功能                                  |
| -------------------------------- | ------- | ------------------------------------- |
| StarterKit                       | Phase 2 | 标题、段落、列表、粗体/斜体/代码      |
| Markdown 快捷输入                | Phase 2 | `#` → H1, `-` → 列表, `**` → 粗体     |
| 模式切换（所见即所得 ↔ MD 源码） | Phase 2 | 桌面: 所见即所得默认。移动: MD 默认。 |
| 图片节点（自定义）               | Phase 3 | 拖拽/粘贴上传 → IndexedDB → 内嵌渲染  |
| 视频节点（自定义）               | Phase 3 | 嵌入 `<video>` 或 URL 引用            |
| 斜杠命令                         | Phase 3 | 输入 `/` → 命令面板（类似 Notion）    |
| 代码块 + 语法高亮                | Phase 4 | Shiki 或 Prism 集成                   |
| 表格                             | Phase 4 | ProseMirror 表格扩展                  |
| 待办/复选框                      | Phase 4 | 任务列表项                            |
| 数学公式（KaTeX）                | Phase 5 | LaTeX 渲染                            |
| 嵌入式 iframe                    | Phase 5 | 网页内容嵌入                          |
| 双向链接 [[note]]                | Phase 6 | 笔记间互引用                          |
| 画板/白板                        | Phase 7 | 绘图和图表                            |

每个扩展是独立的 TipTap 插件模块，按需加载。核心编辑器体积保持小巧。

### 内容 ↔ 存储 流程

```
用户在 TipTap 中输入 → 编辑器内容变更
  → debounce 500ms → onAutoSave hook 触发
  → notesStore.updateNote() → StorageAdapter.updateNote()
  → SQLite: 更新 notes 行（content_json + md_text）
  → version 递增（用于后续同步）
```

Markdown 和 ProseMirror JSON 双向同步：

- 所见即所得模式：TipTap 生成 ProseMirror JSON；Markdown 通过 `tiptap-markdown` 序列器派生
- MD 源码模式：用户编辑原始 Markdown；通过 markdown 解析器解析为 ProseMirror JSON
- 两种表示均存储在 `notes` 表中，用于即时模式切换

### 响应式设计策略

断点（TailwindCSS 默认值）：

| 断点                 | 宽度      | 行为                                    |
| -------------------- | --------- | --------------------------------------- |
| `< sm`（640px）      | 手机      | 堆栈导航，MD 源码默认，底部浮动操作按钮 |
| `sm–md`（640–768px） | 小平板    | 双栏窄版，可切换编辑模式                |
| `≥ md`（768px）      | 桌面/平板 | 双栏聚焦，所见即所得默认，侧栏可见      |

`useResponsive` hook 读取 `window.innerWidth`，返回 `isMobile`、`isTablet`、`isDesktop`。布局组件据此切换。

移动端触摸交互：

- `touch-action: manipulation` 消除 300ms 点击延迟
- `visualViewport` resize 监听器，键盘弹出时调整编辑区高度
- `@use-gesture/react` 处理滑动/长按交互
- Radix UI 上下文菜单触摸适配（长按 = 右键）

### 首屏体验（快速笔记）

启动时，用户看到：

1. 居中的"快速笔记"输入框，占位文字 "想写点什么？"
2. 下方：最近笔记横向卡片（标题、日期、标签）
3. 底部：导航标签（全部笔记、文件夹、搜索、设置）

用户在快速笔记中输入时：

- 首次按键立即创建新笔记
- 标题从第一行自动提取
- 内容每 500ms 自动保存
- 停顿 2 秒后笔记出现在"最近"列表

从笔记详情返回时：

- 快速笔记输入框重置为空（每次重新开始）
- 最近列表显示最后 5–10 条笔记，按 `updated_at` 排序

### 附件上传流程

```
用户拖入/粘贴/选择文件
  → 文件校验（最大 50MB，允许的 MIME 类型）
  → 生成 UUID 文件名
  → 原始 Blob 存入 IndexedDB（attachments-store，键 = 附件 ID）
  → 如果是图片则生成缩略图（缩放至 200px 宽度，存入 thumbnails-store）
  → SQLite 中插入 Attachment 行（id、note_id、type、filename、mime_type、size）
  → TipTap: 插入 Image/Video 节点，引用附件 ID
  → 编辑器渲染: <img src="attachment://id" /> → 从 IndexedDB 解析
```

移动端：文件输入使用 `<input type="file" accept="image/*,video/*">`，在 iOS/Android 浏览器触发相机/相册选择器。

大文件处理：

- 图片 > 5MB：存储前压缩（浏览器 Canvas 缩放）
- 视频：原始文件存 IndexedDB，通过 `<video>` 流式解码渲染
- 缩略图用于网格/列表视图，避免加载完整 Blob

### 搜索

搜索支持多个维度，用户可单独使用或组合筛选：

| 维度           | 实现                                   | 说明                                                                                               |
| -------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **全文搜索**   | FTS5 `simple` 分词器                   | 搜索笔记标题和正文内容。支持基础中文（字符级分词）。搜"笔记"可匹配"笔记"，但搜"笔"无法匹配"笔记"。 |
| **文件夹筛选** | SQL `WHERE folder_id = ?`              | 按文件夹范围过滤笔记。可递归包含子文件夹。                                                         |
| **标签筛选**   | SQL JOIN `note_tags`                   | 按标签过滤，支持多标签组合（交集 or 并集）。如"工作 + 重要" = 同时有这两个标签的笔记。             |
| **类型筛选**   | SQL `WHERE type = ?`                   | 按笔记类型过滤：纯文本 / Markdown / 富文本。                                                       |
| **附件筛选**   | SQL JOIN `attachments`                 | 查找包含图片/视频/音频的笔记。如"有图片的笔记"。                                                   |
| **时间筛选**   | SQL `WHERE created_at BETWEEN ? AND ?` | 按创建/更新时间范围过滤。如"最近7天"、"今天"。                                                     |
| **删除状态**   | SQL `WHERE deleted_at IS NOT NULL`     | 在回收站中搜索。                                                                                   |

**搜索 UI 交互：**

- 搜索栏：输入关键词 → 触发全文搜索
- 搜索栏下方：可展开的筛选面板（文件夹、标签、时间、类型等）
- 标签筛选：下拉多选框，选择多个标签后可选"交集"（同时包含）或"并集"（包含任一）
- 结果列表：显示匹配笔记，高亮关键词位置，标注匹配维度（标题/内容/标签）
- 结果分页：limit 50，按 `updated_at` 降序

**StorageAdapter 搜索 API：**

```typescript
interface SearchInput {
  query?: string;                    // 全文搜索关键词（可选）
  folderId?: string;                 // 文件夹筛选（可选，递归包含子文件夹）
  tagIds?: string[];                 // 标签筛选（可选，多选）
  tagMode?: 'intersection' | 'union'; // 标签组合模式：交集/并集
  type?: NoteType;                   // 笔记类型筛选（可选）
  hasAttachment?: AttachmentType;    // 包含指定类型附件（可选）
  dateRange?: {                      // 时间范围（可选）
    field: 'created_at' | 'updated_at';
    from?: number;
    to?: number;
  };
  includeDeleted?: boolean;          // 是否包含回收站笔记（默认 false）
  sortBy?: 'updated_at' | 'created_at' | 'title';
  sortOrder?: 'desc' | 'asc';
  limit?: number;                    // 分页大小（默认 50）
  offset?: number;                   // 分页偏移
}

searchNotes(input: SearchInput): Promise<SearchResult>;

interface SearchResult {
  notes: Note[];
  total: number;                     // 总匹配数
  hasMore: boolean;                  // 是否有更多结果
}
```

**FTS5 中文搜索局限与演进：**

MVP 使用 `simple` 分词器（字符级）。局限：

- 搜"笔"无法匹配"笔记"（无前缀匹配）
- 无语义理解

Phase 5+ 集成 jieba WASM 实现精确中文分词和前缀匹配。

### PWA 配置

```json
{
  "name": "笔记",
  "short_name": "笔记",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fafafa",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

VitePWA 插件自动生成 Service Worker，缓存所有静态资源以支持离线可用。数据已在本地，应用完全离线工作。

### 数据完整性与安全

| 场景              | 缓解措施                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| 浏览器清缓存      | IndexedDB 数据除非显式清除才会丢失。SQLite 数据在 Origin Private FS 中。首次访问提示用户数据持久性。 |
| 多标签页写入      | SharedWorker 单写锁                                                                                  |
| 误删笔记          | 软删除 + 30 天回收站。仅从回收站可彻底删除。                                                         |
| 附件丢失          | 启动时完整性校验：验证每个附件 ID 有对应 IndexedDB Blob。UI 中标记缺失项。                           |
| Markdown 渲染 XSS | DOMPurify 对所有渲染的 Markdown 内容进行消毒                                                         |
| 数据损坏          | SQLite 内置日志机制。IndexedDB 支持事务。自动备份：每周导出到 IndexedDB 备份存储。                   |
| 写入时断电        | SQLite WAL 模式 + fsync。自动保存 debounce 最多丢失 500ms 内容。                                     |

### 数据导出/导入

导出格式：

1. **Markdown 包**: zip 文件，包含 .md 文件 + attachments 文件夹。兼容 Obsidian 导入。
2. **独立 HTML**: 单个 HTML 页面，图片以 base64 内嵌。用于分享。
3. **JSON 转储**: 完整数据库导出，用于备份/恢复。

导入格式：

1. **Obsidian 仓库**: 扫描文件夹结构 → 从 .md 文件创建文件夹 + 笔记 → 导入附件
2. **Markdown 文件**: 批量拖放 → 创建独立笔记
3. **JSON 转储**: 从先前备份恢复

### 云同步（未来 — Phase 6）

Yjs CRDT 引擎：

- 本地变更生成 Yjs 更新片段
- 在线时通过 WebSocket 推送更新到同步服务端
- 拉取远程更新，自动合并（CRDT 保证收敛）
- 离线时：本地排队更新，重连后同步
- 无需手动冲突解决

同步服务端：Node.js + WebSocket + PostgreSQL（仅存储更新片段，非权威数据源）。JWT 认证。

### 分享（未来 — Phase 6+）

Phase 5：静态 HTML 导出（无需服务端）
Phase 6：公开只读链接（需同步服务端运行，生成分享 URL，可选密码保护和过期时间）

### 关键依赖

```json
{
  "packages/web": {
    "dependencies": {
      "react": "^18",
      "react-dom": "^18",
      "@tiptap/react": "^2",
      "@tiptap/starter-kit": "^2",
      "@tiptap/pm": "^2",
      "@tiptap/extension-image": "^2",
      "@tiptap/extension-placeholder": "^2",
      "@tiptap/extension-markdown": "^2",
      "zustand": "^4",
      "wa-sqlite": "latest",
      "@radix-ui/react-dialog": "latest",
      "@radix-ui/react-dropdown-menu": "latest",
      "@radix-ui/react-context-menu": "latest",
      "@radix-ui/react-tabs": "latest",
      "@use-gesture/react": "latest",
      "dompurify": "^3",
      "uuid": "^9",
      "@tanstack/react-virtual": "latest"
    },
    "devDependencies": {
      "vite": "^5",
      "vite-plugin-pwa": "latest",
      "@vitejs/plugin-react": "latest",
      "vitest": "latest",
      "typescript": "^5",
      "tailwindcss": "^3",
      "postcss": "latest",
      "autoprefixer": "latest"
    }
  },
  "packages/core": {
    "dependencies": {
      "uuid": "^9",
      "yjs": "^13"
    }
  }
}
```

### 实施阶段

| 阶段 | 范围                                                                  | 交付物                           | 状态      |
| ---- | --------------------------------------------------------------------- | -------------------------------- | --------- |
| P0   | Monorepo 搭建、构建工具链、开发环境                                   | 可运行的空项目骨架               | ✅ 已完成 |
| P1   | 数据模型、StorageAdapter、SQLite + IndexedDB、CRUD API、Zustand store | 笔记 CRUD 通过 API 可用          | ✅ 已完成 |
| P2   | TipTap 编辑器集成、Markdown 快捷输入、模式切换、自动保存              | 文本/Markdown 笔记可编辑并持久化 | ✅ 已完成 |
| P3   | 图片/视频自定义扩展、上传流程、缩略图、响应式渲染                     | 富媒体笔记可用                   | ✅ 已完成 |
| P4   | 桌面双栏布局、移动端堆栈导航、文件夹树、标签、搜索、暗色/亮色主题     | 完整 UI + 响应式布局             | ✅ 已完成 |
| P5   | PWA、离线支持、数据导出/导入（Markdown + JSON）、回收站               | 生产可用 Web 应用                | ✅ 已完成 |
| P6   | Yjs 同步引擎、同步服务端、公开分享链接                                | 多设备同步 + 分享                | ✅ 已完成 |
