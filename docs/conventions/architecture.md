# 架构规范

> 本文档描述项目整体架构决策，新改动应遵循已有架构模式。

## 三包边界

- **`@notes/core`** 是纯 TS 库，不含 React、不含浏览器 DOM API（`indexeddb.ts` 除外）。所有数据模型、存储接口、搜索逻辑、同步类型在此定义。
- **`@notes/web`** 是 React 前端，通过 Vite alias 直接引用 core 源码（不走构建产物）。web 不得重复定义 core 已有的类型或函数。
- **`@notes/sync-server`** 是 Fastify 同步服务端，独立 Node.js 进程，不依赖 web 包。可复用 core 的类型定义（通过 workspace 引用）。
- 跨包依赖只能是 web → core、sync-server → core，core 不依赖 web 或 sync-server。

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
- **SharedWorker 消息必须串行处理**：`port.onmessage` 不能直接用 async handler，否则多个 `handleRequest` 并发交错执行会导致 wa-sqlite VFS（IDBBatchAtomicVFS）并发 IndexedDB 事务冲突，出现 "no such table" 或 "unable to open database file" 错误。必须用消息队列 + 串行 `processQueue` 逐条处理。
- **Soft Delete 仅用于 Note**：`deleteNote` 设 `deletedAt`，`permanentlyDeleteNote` 才真正删除行。Folder 直接硬删，没有软删除。
- ID 在 adapter 内部生成（`generateId()`），调用方不传 id。
- **数据加载应在各组件 useEffect 中分散发起**：不要在 App.tsx 集中式加载所有数据后再渲染，因为 SharedWorker 初始化阶段（DDL 建表）与并发查询会冲突。各组件在挂载时各自调用 `listNotes/listFolders/listTags` 即可，串行队列保证执行安全。
- **currentFolderId 过滤必须用 store 状态而非 searchInput 状态**：`Sidebar.tsx` 的 `finalNotes` 过滤应使用 `useFoldersStore((s) => s.currentFolderId)` 而非 `searchInput.folderId`，后者仅在搜索面板选中时才有值。

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

## 云同步架构

### 同步是可选的叠加层

- 未配置服务端时，应用行为与纯本地模式完全一致。
- 配置服务端后，同步引擎在本地存储之上叠加 Yjs CRDT 同步。
- 现有 `StorageAdapter` / `WebStorageAdapter` / `useStorage` 接口**不变**，同步对组件透明。

### 内容同步（Yjs WebSocket）

- 每篇笔记 = 一个 Yjs Doc（`note:{noteId}`），通过 WebSocket 实时同步。
- 服务端使用 `y-protocols` 实现 Yjs 同步协议（syncStep1/syncStep2/update），通过 `@fastify/websocket` 处理连接。
- Yjs 更新片段持久化到 PostgreSQL `yjs_updates` 表。
- 客户端使用 `y-websocket` 的 `WebsocketProvider` + `y-indexeddb` 离线缓存。
- `SyncEngine`（`web/src/lib/sync-engine.ts`）封装 Doc 生命周期管理。

### 元数据同步（REST）

- 文件夹、标签、附件元数据走 REST API + last-write-wins（version 字段冲突保护）。
- `GET /api/v1/metadata/sync` 全量拉取，`POST /api/v1/metadata/batch` 批量推送。

### 附件同步

- 附件二进制文件走 REST 上传/下载（multipart），不经过 Yjs。
- 服务端存储在本地磁盘（`ATTACHMENT_DIR`），支持可配置同步策略（全量/按需/大小阈值）。

### 分享与权限

- 公开链接（`GET /api/v1/shares/public/:token`）支持密码保护和过期时间。
- 指定用户共享支持 read/write 权限。
- WebSocket 连接时校验用户对 doc 的访问权限（所有者 or 被分享者），只读用户不能写入。

### 认证

- JWT 认证（access token 1h + refresh token 30d），bcrypt 密码哈希。
- 客户端 `authStore` 管理认证状态，token 存 localStorage。
- App 启动时自动从 localStorage 恢复认证状态并连接同步服务。

### 关键约束

- **sync-server 需要 PostgreSQL**：开发环境用 `docker compose up -d db` 启动，迁移用 `pnpm --filter @notes/sync-server migrate`。
- **sync-server 测试需要数据库**：无 PostgreSQL 时集成测试自动跳过（`describe.skipIf`），不影响其他包。
- **附件上传限制 50MB**：`@fastify/multipart` 配置 `limits.fileSize: 50 * 1024 * 1024`。
