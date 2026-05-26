# 架构规范

> 本文档描述项目整体架构决策，新改动应遵循已有架构模式。

## 双包边界

- **`@notes/core`** 是纯 TS 库，不含 React、不含浏览器 DOM API（`indexeddb.ts` 除外）。所有数据模型、存储接口、搜索逻辑在此定义。
- **`@notes/web`** 是 React 前端，通过 Vite alias 直接引用 core 源码（不走构建产物）。web 不得重复定义 core 已有的类型或函数。
- 跨包依赖只能是 web → core，core 不依赖 web。

## 存储层架构

### 双引擎

- 结构化数据（notes、folders、tags、attachments 元数据）存储在 **wa-sqlite**，支持 SQL 查询和 FTS5 全文搜索。
- 二进制数据（attachment 文件、缩略图）存储在 **IndexedDB**。
- 不要合并这两类存储：SQL 用于查询，IDB 用于 blob，各有优势。

### Adapter 模式

- `StorageAdapter` 接口（`storage/adapter.ts`）定义了全部 CRUD 合约。
- `WebStorageAdapter`（`storage/web-adapter.ts`）是主实现。
- `SharedWorkerStorageAdapter`（`lib/sqlite-shared-worker.ts`）通过 SharedWorker 代理 SQL，支持多标签页共享数据。
- 初始化逻辑（`lib/sqlite-init.ts`）优先 SharedWorker，失败则回退直连。`getStorage()` 是全局单例入口，使用前必须先 `initStorage()`。

### 关键约束

- **wa-sqlite 需要 COOP/COEP 头**（SharedArrayBuffer），Vite dev server 和 vitest browser config 都设了，不要去掉。
- **Soft Delete 仅用于 Note**：`deleteNote` 设 `deletedAt`，`permanentlyDeleteNote` 才真正删除行。Folder 直接硬删，没有软删除。
- ID 在 adapter 内部生成（`generateId()`），调用方不传 id。

## Attachment 协议

编辑器使用 `attachment://<id>` 自定义 URI 方案，解耦内容与 blob 解析：

- 编辑器只存储 URI 字符串，不持有 Object URL。
- `useAttachmentRenderer(src)` 在渲染时解析为 blob Object URL。
- Object URL 缓存在模块级 `objectUrlCache` Map 中，必须通过 `revokeAttachmentObjectUrl/revokeAllObjectUrls` 释放，否则内存泄漏。

## Markdown 双向转换

`markdown-serializer.ts` 提供 `markdownToProseMirrorJSON` 和 `proseMirrorJSONToMarkdown`，支持编辑器的 "markdown 模式" 切换。自定义规则覆盖图片、视频、任务列表、表格、代码块。修改编辑器节点时需同步更新 serializer。

## 状态管理架构

Zustand stores 是唯一的客户端状态层。详见 [组件规范 → Store 使用](./components.md#store-使用)。

存储层（adapter）和状态层（store）的分工：

- **adapter**：持久化读写，无 React 依赖。
- **store**：缓存 + UI 状态，通过 `getStorage()` 调用 adapter，用 `set` 更新缓存。
- **hook**（`useStorage`）：桥接 adapter 到 React 的 useCallback 封装，供组件使用。

### 搜索/筛选数据流

桌面端 Sidebar 采用**客户端筛选 + 数据库搜索**双重机制：

```
用户输入 → SearchBar / SearchFilterPanel
  → useSearch.updateFilter → 合并 searchInput
    → 客户端即时筛选（query includes title/mdText、folderId 匹配）
    → executeSearch → storage.searchNotes → FTS5 SQL → SearchResult
```

- 客户端筛选保证即时响应（不受异步搜索延迟影响）。
- 数据库搜索（FTS5）提供更精确的全文匹配结果，与客户端筛选交叉过滤。
- 移动端 MobileSearch 不使用客户端筛选，直接渲染 `SearchResultList`。
