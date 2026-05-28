# P6 — 云同步与分享 设计规格

**日期:** 2026-05-28
**状态:** 已审阅 — 待实施
**依赖:** P0–P5 已完成

## 概述

P6 的目标是为笔记应用添加云同步和分享功能：

1. **多设备同步** — 同一用户在手机、平板、电脑之间实时同步笔记
2. **多人协作** — 多个用户可共同编辑同一篇笔记
3. **分享功能** — 公开只读链接 + 指定用户共享（只读/编辑权限）

### 核心决策

| 决策项       | 选择                         | 理由                                              |
| ------------ | ---------------------------- | ------------------------------------------------- |
| 同步技术     | Yjs CRDT                     | 自动冲突解决，天然支持协作，离线优先              |
| 服务端技术栈 | Node.js + Fastify            | 与前端同语言，可复用 core 类型，生态成熟          |
| 服务端数据库 | PostgreSQL                   | 成熟稳定，JSONB 支持好，适合存储 Yjs 更新片段     |
| 部署方式     | 自托管 (Self-hosted)         | Docker Compose 一键部署，数据完全在用户手中       |
| 认证方式     | 用户名 + 密码                | 完整用户系统，支持多用户共享一个服务端            |
| 代码组织     | Monorepo 第三个包            | `packages/sync-server`，可复用 `@notes/core` 类型 |
| 同步范围     | Yjs 管内容，REST 管元数据    | 职责分离，内容自动合并，元数据 last-write-wins    |
| 附件同步     | 可配置（全量/按需/大小阈值） | 用户可根据网络/存储情况灵活选择                   |
| 同步可选性   | 同步是可选的                 | 未配置服务端时，应用行为与纯本地模式完全一致      |

## 1. 整体架构

```
┌─────────────────────────────────────┐
│           客户端 (web)               │
│                                     │
│  TipTap Editor                      │
│    ↓ onChange                       │
│  Yjs Doc (per note)                 │
│    ↓ y-websocket provider           │
│  WebSocket connection               │
└──────────┬──────────────────────────┘
           │ wss://
┌──────────▼──────────────────────────┐
│        sync-server (Fastify)        │
│                                     │
│  @fastify/websocket                 │
│    ↓                                │
│  y-websocket-server                 │
│    ↓                                │
│  PostgreSQL                         │
│    - users (认证)                    │
│    - yjs_updates (二进制更新片段)     │
│    - metadata (folders/tags/shares) │
│    - attachments_meta               │
│                                     │
│  REST API (/api/v1/...)             │
│    - auth (注册/登录/刷新token)      │
│    - metadata CRUD                  │
│    - attachments (上传/下载)         │
│    - shares (公开链接/用户共享)       │
└─────────────────────────────────────┘
```

### 核心原则

- **Yjs 管内容**：每篇笔记 = 一个 Yjs Doc，通过 WebSocket 实时同步
- **REST 管元数据**：folders、tags、附件元数据、用户、分享 — 走 HTTP API
- **附件二进制**：大文件走 REST 上传/下载，不经过 Yjs（避免 Yjs Doc 膨胀）
- **离线优先**：客户端 y-indexeddb 缓存 Yjs 状态，离线编辑 → 重连自动合并

## 2. 数据模型

### 2.1 服务端 PostgreSQL

```sql
-- 用户系统
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yjs 文档更新片段（核心同步数据）
CREATE TABLE yjs_updates (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  doc_name TEXT NOT NULL,        -- "note:{noteId}" 格式
  update BYTEA NOT NULL,         -- Yjs 二进制更新
  clock BIGINT NOT NULL,         -- 服务端单调递增时钟
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_yjs_doc ON yjs_updates(doc_name, clock);

-- 笔记元数据（不含内容，内容由 Yjs 管理）
CREATE TABLE note_metadata (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  folder_id TEXT,
  type TEXT DEFAULT 'rich',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  deleted_at BIGINT,
  version INTEGER DEFAULT 1
);

-- 文件夹
CREATE TABLE folders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- 标签
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE note_tags (
  note_id TEXT REFERENCES note_metadata(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

-- 附件元数据（二进制存本地文件系统）
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  note_id TEXT REFERENCES note_metadata(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

-- 分享
CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) NOT NULL,
  note_id TEXT REFERENCES note_metadata(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- 'public_link' | 'user_share'
  target_user_id TEXT REFERENCES users(id),  -- user_share 时非空
  permission TEXT DEFAULT 'read',  -- 'read' | 'write'
  password_hash TEXT,              -- public_link 可选密码
  expires_at TIMESTAMPTZ,          -- 可选过期时间
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Yjs Doc 结构

每篇笔记一个 Yjs Doc，doc name = `note:{noteId}`：

```typescript
// Yjs Doc 内部结构
const doc = new Y.Doc();

// 笔记内容 — 两个表示（与现有架构一致）
const contentJson = doc.getXmlFragment("contentJson"); // ProseMirror XML
const mdText = doc.getText("mdText"); // Markdown 纯文本
```

**为什么用 XmlFragment 存 ProseMirror？**

- Yjs 有官方 ProseMirror 绑定（`y-prosemirror`），直接用 `Y.XmlFragment` 映射 ProseMirror 文档结构
- 富文本协作编辑时，Yjs 自动处理光标、选区、并发操作
- Markdown 文本用 `Y.Text` 即可，天然支持字符级 CRDT

**TipTap 集成方式：**

```
TipTap Editor
  ↕ y-prosemirror binding
Y.XmlFragment (contentJson)
  ↕ onChange → serialize
Y.Text (mdText)  ← 保持双表示同步
```

### 2.3 客户端本地存储

现有架构不变，新增一层 Yjs 缓存：

```
IndexedDB (y-indexeddb)  ← Yjs Doc 本地缓存，离线可用
wa-sqlite                ← 元数据本地缓存（现有）
IndexedDB (attachments)  ← 附件 blob（现有）
```

**现有数据库表结构完全保留**：`notes`、`folders`、`tags`、`note_tags`、`attachments`、`notes_fts` 表和字段不变。`content_json` 和 `md_text` 字段保留，角色从"权威源"变为"本地缓存"，同步引擎在 Yjs Doc 变更时自动回写。

## 3. 同步引擎与数据流

### 3.1 SyncEngine 生命周期

```typescript
// packages/core/src/sync/engine.ts
class SyncEngine {
  private wsProvider: WebsocketProvider | null;
  private docs: Map<string, Y.Doc>; // docName → Y.Doc

  async connect(config: SyncConfig): Promise<void>;
  async disconnect(): Promise<void>;

  // 获取/创建笔记的 Yjs Doc
  getNoteDoc(noteId: string): Y.Doc;

  // 销毁笔记 Doc（删除笔记时）
  destroyNoteDoc(noteId: string): void;
}
```

### 3.2 笔记编辑数据流

```
用户在 TipTap 输入
  ↓
y-prosemirror binding 自动将操作写入 Y.XmlFragment
  ↓
Yjs Doc 产生 update 事件
  ↓
y-websocket provider 发送 update 到服务端
  ↓
服务端写入 yjs_updates 表 (BYTEA)
  ↓
服务端广播 update 给同 doc 的其他在线客户端
  ↓
其他客户端 y-websocket 收到 update → 应用到本地 Yjs Doc
  ↓
y-prosemirror binding 自动更新 TipTap 编辑器
  ↓
SyncEngine 回写 notes 表 (content_json + md_text) ← 本地缓存
```

### 3.3 离线 → 重连流程

```
离线编辑
  ↓
Yjs Doc 本地更新 → y-indexeddb 持久化缓存
  ↓
y-websocket provider 检测到断连，进入 buffering 状态
  ↓
重连时
  ↓
provider 发送本地 state vector → 服务端返回缺失的 updates
  ↓
客户端应用远程 updates → Yjs CRDT 自动合并
  ↓
客户端发送本地缓冲的 updates → 服务端存储
```

### 3.4 元数据同步（REST）

元数据不走 Yjs，走 REST API + last-write-wins：

```typescript
// 客户端调用
syncMetadata(entity: 'folder' | 'tag' | 'attachment', op: 'create' | 'update' | 'delete', data: any)

// 流程：
// 1. 写入本地 wa-sqlite
// 2. POST/PUT/DELETE /api/v1/metadata
// 3. 服务端用 version 字段检测冲突
// 4. 冲突时返回 409，客户端提示用户选择
```

### 3.5 附件同步

```
上传附件
  ↓
本地：Blob 存入 IndexedDB，元数据存入 wa-sqlite
  ↓
REST POST /api/v1/attachments (multipart upload)
  ↓
服务端：文件存本地磁盘，元数据存 PostgreSQL
  ↓
其他设备拉取笔记时
  ↓
全量模式：自动下载附件 blob 到 IndexedDB
按需模式：仅下载元数据，打开笔记时按需拉取 blob
```

附件同步策略配置：

```typescript
interface SyncConfig {
  serverUrl: string;
  token: string;
  attachmentStrategy: "full" | "on-demand" | { maxSizeMB: number };
}
```

## 4. 服务端设计

### 4.1 目录结构

```
packages/sync-server/
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml          # Fastify + PostgreSQL 一键启动
└── src/
    ├── server.ts               # Fastify 入口
    ├── config.ts               # 环境变量配置
    ├── auth/
    │   ├── routes.ts           # POST /register, /login, /refresh
    │   ├── middleware.ts       # JWT 验证中间件
    │   └── password.ts         # bcrypt 哈希
    ├── routes/
    │   ├── metadata.ts         # 元数据 CRUD (folders/tags/note_metadata/attachments)
    │   ├── attachments.ts      # 附件上传/下载
    │   └── shares.ts           # 分享管理
    ├── ws/
    │   ├── handler.ts          # WebSocket 连接处理
    │   └── yjs-server.ts       # Yjs update 存储/广播
    └── db/
        ├── schema.sql
        ├── migrate.ts
        └── client.ts           # pg 连接池
```

### 4.2 REST API

```
POST   /api/v1/auth/register        # 注册
POST   /api/v1/auth/login           # 登录 → 返回 JWT
POST   /api/v1/auth/refresh         # 刷新 token

GET    /api/v1/metadata/sync        # 拉取所有元数据（首次同步/全量）
POST   /api/v1/metadata/batch       # 批量推送本地变更（last-write-wins）

POST   /api/v1/attachments          # 上传附件 (multipart)
GET    /api/v1/attachments/:id      # 下载附件 blob
DELETE /api/v1/attachments/:id      # 删除附件

POST   /api/v1/shares               # 创建分享
GET    /api/v1/shares               # 列出我的分享
DELETE /api/v1/shares/:id           # 删除分享
GET    /api/v1/shares/public/:token # 公开链接访问（无需认证）
```

### 4.3 WebSocket 协议

```
WS /ws?token=<jwt>

客户端 → 服务端：
  { type: "sync", docName: "note:abc123", update: <Uint8Array> }
  { type: "awareness", docName: "note:abc123", update: <Uint8Array> }

服务端 → 客户端：
  { type: "sync", docName: "note:abc123", update: <Uint8Array> }
  { type: "awareness", docName: "note:abc123", update: <Uint8Array> }
```

直接使用 `y-websocket` 的协议格式（二进制消息），不需要自定义 JSON 封装。`y-websocket` 库自带 server 端（`y-websocket-server`），可以直接集成到 Fastify 的 WebSocket handler 中。

### 4.4 Yjs 服务端存储策略

```
实时更新 → 写入 yjs_updates 表（追加）
         ↓
定期压缩（cron job，每小时）：
  1. 读取某 doc_name 的所有 updates
  2. Y.applyUpdates → 合并为完整 state
  3. 删除旧 updates，写入一条压缩后的 update
  4. 减少存储体积和首次加载时间
```

### 4.5 部署

```yaml
# docker-compose.yml
services:
  server:
    build: .
    ports: ["3001:3001"]
    environment:
      DATABASE_URL: postgres://notes:notes@db:5432/notes_sync
      JWT_SECRET: ${JWT_SECRET}
      ATTACHMENT_DIR: /data/attachments
    volumes:
      - attachments:/data/attachments

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: notes_sync
      POSTGRES_USER: notes
      POSTGRES_PASSWORD: notes
    volumes:
      - pgdata:/var/lib/postgresql/data
```

## 5. 分享功能

### 5.1 公开链接

```
创建流程：
  用户点击笔记 → "分享" → 生成公开链接
  ↓
  POST /api/v1/shares { noteId, type: 'public_link', password?, expiresAt? }
  ↓
  服务端生成 share token (nanoid)，返回 URL
  ↓
  https://your-server.com/s/{token}

访问流程：
  访客打开链接
  ↓
  GET /api/v1/shares/public/{token}
  ↓
  检查：过期？密码？→ 返回笔记内容（只读）
  ↓
  服务端从 Yjs Doc 序列化为 Markdown/HTML 返回
  ↓
  前端渲染为只读页面（无编辑器，纯展示）
```

### 5.2 指定用户共享

```
创建流程：
  用户点击笔记 → "共享给..." → 输入用户名 + 权限
  ↓
  POST /api/v1/shares { noteId, type: 'user_share', targetUserId, permission }
  ↓
  目标用户登录后，GET /api/v1/metadata/sync 返回包含共享笔记

权限模型：
  read  → 目标用户可查看笔记内容（只读 Yjs Doc）
  write → 目标用户可编辑（加入同一个 Yjs Doc 的 WebSocket room）
```

### 5.3 共享笔记的 Yjs 访问控制

```
WebSocket 连接时验证：
  1. JWT token 验证用户身份
  2. 检查 doc_name 对应的 note_id
  3. 查询 shares 表：该用户是否有权限访问此笔记
  4. read 权限 → 只接收 updates，不广播其 writes
  5. write 权限 → 双向同步
  6. 所有者 → 完全权限
```

### 5.4 分享 UI

| 组件           | 位置                      | 功能                               |
| -------------- | ------------------------- | ---------------------------------- |
| `ShareDialog`  | 笔记右键菜单 / 工具栏按钮 | 创建/管理分享                      |
| 公开链接面板   | ShareDialog 内            | 生成链接、设密码、设过期、复制链接 |
| 用户共享面板   | ShareDialog 内            | 搜索用户、设权限、移除共享         |
| 共享给我的列表 | Sidebar 新增区域          | 显示别人共享给我的笔记             |

### 5.5 分享页面（公开链接）

```
路由：/s/:token
  ↓
无需登录，纯只读展示页
  ↓
渲染笔记内容（Markdown → HTML）
  ↓
附件图片通过 /api/v1/attachments/:id 加载（公开链接的附件也公开）
```

## 6. 认证与安全

### 6.1 认证流程

```
注册：
  POST /api/v1/auth/register { username, password }
  ↓
  服务端：bcrypt 哈希密码 → 存入 users 表 → 返回 JWT (access + refresh)

登录：
  POST /api/v1/auth/login { username, password }
  ↓
  服务端：验证密码 → 返回 JWT (access 1h + refresh 30d)

Token 刷新：
  POST /api/v1/auth/refresh { refreshToken }
  ↓
  服务端：验证 refresh token → 返回新的 access token

客户端存储：
  access token → 内存（syncStore）
  refresh token → localStorage
```

### 6.2 安全策略

| 维度     | 措施                                                        |
| -------- | ----------------------------------------------------------- |
| 密码存储 | bcrypt (cost factor 12)                                     |
| 传输安全 | 强制 HTTPS（生产），WSS（WebSocket）                        |
| JWT      | RS256 签名，access token 短过期 (1h)                        |
| 数据隔离 | 所有 SQL 查询带 `WHERE user_id = ?`，用户只能访问自己的数据 |
| 附件上传 | 限制文件大小（默认 50MB），校验 MIME 类型                   |
| 公开链接 | token 用 nanoid(24) 生成，不可猜测                          |
| CORS     | 服务端配置允许的 origin                                     |

### 6.3 客户端 Auth 状态

```typescript
// packages/web/src/stores/authStore.ts
interface AuthState {
  user: { id: string; username: string } | null;
  serverUrl: string | null; // 服务端地址（用户配置）
  accessToken: string | null;
  isAuthenticated: boolean;
  isSyncEnabled: boolean; // serverUrl 非空且已登录

  login(serverUrl: string, username: string, password: string): Promise<void>;
  register(serverUrl: string, username: string, password: string): Promise<void>;
  logout(): void;
  refresh(): Promise<void>;
}
```

`isSyncEnabled === false` 时，应用行为和现在完全一致（纯本地模式）。

## 7. 对现有代码的影响

### 7.1 新增文件

```
packages/
├── core/
│   └── src/
│       └── sync/                    ← 新增目录
│           ├── engine.ts            # SyncEngine 类
│           ├── types.ts             # SyncConfig, SyncState 等类型
│           └── index.ts
├── web/
│   └── src/
│       ├── lib/
│       │   └── sync-provider.ts     ← 新增：y-websocket 连接管理
│       ├── stores/
│       │   ├── authStore.ts         ← 新增
│       │   └── syncStore.ts         ← 新增
│       ├── hooks/
│       │   └── useSync.ts           ← 新增
│       └── components/
│           ├── auth/                ← 新增目录
│           │   ├── LoginPage.tsx
│           │   └── RegisterPage.tsx
│           └── shared/
│               └── ShareDialog.tsx  ← 新增
└── sync-server/                     ← 新增包
```

### 7.2 现有代码改动

| 文件                      | 改动                                                           | 程度 |
| ------------------------- | -------------------------------------------------------------- | ---- |
| `core/src/index.ts`       | 新增 `export * from "./sync"`                                  | 1 行 |
| `core/package.json`       | 新增 `yjs`、`y-websocket`、`y-prosemirror`、`y-indexeddb` 依赖 | 4 行 |
| `web/src/App.tsx`         | 新增 auth 状态判断 + SyncEngine 初始化                         | 小改 |
| `web/src/stores/index.ts` | 新增 authStore、syncStore 导出                                 | 2 行 |
| `turbo.json`              | 新增 sync-server 到 pipeline                                   | 小改 |
| 根 `package.json`         | workspaces 加 `packages/sync-server`                           | 1 行 |

### 7.3 不改的

- `StorageAdapter` 接口 — **不变**，同步层在它之上
- `WebStorageAdapter` — **不变**，继续作为本地存储
- 所有现有组件（Editor、Sidebar、NoteView 等）— **不变**
- `useStorage` hook — **不变**，同步对组件透明
- 客户端数据库表结构 — **不变**

### 7.4 新增页面

| 页面           | 说明                                                 |
| -------------- | ---------------------------------------------------- |
| 登录页         | 用户名 + 密码登录                                    |
| 注册页         | 用户名 + 密码注册                                    |
| 设置页扩展     | 新增"同步设置"（服务端地址、登录状态、附件同步策略） |
| 分享对话框     | 生成公开链接 / 指定用户共享                          |
| 公开链接展示页 | `/s/:token` 路由，只读渲染                           |

### 7.5 现有页面影响

| 组件               | 影响                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| **App.tsx**        | 新增 auth 状态判断，未登录 → 跳转登录页；未配置服务端 → 正常使用（纯本地模式） |
| **Sidebar**        | 顶部显示用户头像/用户名 + 同步状态指示器（已同步/同步中/离线）                 |
| **MobileDrawer**   | 同上，显示用户信息                                                             |
| **MobileSettings** | 新增同步设置区域                                                               |
| **现有 CRUD 页面** | **基本无影响** — 同步逻辑在 adapter/hook 层透明处理                            |

## 8. 实施阶段

P6 拆分为 5 个子阶段：

| 子阶段   | 范围                                   | 交付物                              |
| -------- | -------------------------------------- | ----------------------------------- |
| **P6.1** | sync-server 骨架 + 认证 + 数据库       | 可运行的服务端，注册/登录 API 可用  |
| **P6.2** | Yjs WebSocket 同步 + 客户端 SyncEngine | 笔记内容跨设备实时同步              |
| **P6.3** | 元数据 REST 同步 + 附件同步            | folders/tags/attachments 跨设备同步 |
| **P6.4** | 分享功能（公开链接 + 用户共享）        | 分享对话框、只读页面、权限控制      |
| **P6.5** | 同步 UI（登录页、同步状态、设置）      | 完整用户交互流程                    |

### 依赖关系

```
P6.1 → P6.2 → P6.3 → P6.4
                  ↘ P6.5（可与 P6.4 并行）
```

### 验证标准

- **P6.1**：`docker-compose up` 启动成功，curl 注册/登录返回 JWT
- **P6.2**：两个浏览器标签同时编辑同一笔记，内容实时同步
- **P6.3**：在设备 A 创建文件夹/标签 → 设备 B 刷新后可见
- **P6.4**：生成公开链接 → 无痕窗口打开可查看笔记内容
- **P6.5**：未登录 → 登录页 → 登录后同步启用 → 同步状态正确显示

## 关键依赖

```json
{
  "packages/core": {
    "dependencies": {
      "yjs": "^13",
      "y-websocket": "^2",
      "y-prosemirror": "^1",
      "y-indexeddb": "^9"
    }
  },
  "packages/web": {
    "dependencies": {
      "yjs": "^13",
      "y-websocket": "^2",
      "y-prosemirror": "^1",
      "y-indexeddb": "^9"
    }
  },
  "packages/sync-server": {
    "dependencies": {
      "fastify": "^4",
      "@fastify/websocket": "^10",
      "@fastify/cors": "^9",
      "@fastify/multipart": "^8",
      "@fastify/static": "^7",
      "y-websocket": "^2",
      "yjs": "^13",
      "pg": "^8",
      "bcrypt": "^5",
      "jsonwebtoken": "^9",
      "nanoid": "^5",
      "node-cron": "^3"
    },
    "devDependencies": {
      "@types/pg": "^8",
      "@types/bcrypt": "^5",
      "@types/jsonwebtoken": "^9",
      "@types/node-cron": "^3",
      "typescript": "^5",
      "tsx": "^4"
    }
  }
}
```
