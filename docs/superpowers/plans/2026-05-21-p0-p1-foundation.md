# 笔记应用基础框架与数据层 实施计划 (P0+P1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Monorepo 项目骨架、实现完整的数据模型和存储层（SQLite + IndexedDB），使笔记 CRUD 通过 API 可用。

**Architecture:** Turborepo Monorepo，pnpm 管理。`packages/core` 存放共享数据模型和存储逻辑，`packages/web` 存放 React 前端。wa-sqlite 在 Web 端提供 SQLite 能力，IndexedDB 存二进制附件。StorageAdapter 接口隔离双引擎细节。

**Tech Stack:** TypeScript, pnpm, Turborepo, Vite, React 18, wa-sqlite, IndexedDB, Zustand, Vitest

**设计规格:** `docs/superpowers/specs/2026-05-21-notes-app-design.md`

---

## 文件结构

```
packages/core/src/
├── models/
│   ├── note.ts          # Note 类型定义 + CreateNoteInput/UpdateNoteInput
│   ├── folder.ts        # Folder 类型定义 + CreateFolderInput/UpdateFolderInput
│   ├── attachment.ts    # Attachment 类型定义 + AttachmentType enum
│   ├── tag.ts           # Tag 类型定义
│   ├── search.ts        # SearchInput/SearchResult 类型定义
│   └── index.ts         # 统一导出
├── storage/
│   ├── adapter.ts       # StorageAdapter 接口定义
│   ├── sqlite.ts        # wa-sqlite 初始化 + DDL + 通用查询
│   ├── indexeddb.ts     # IndexedDB 附件存储实现
│   ├── web-adapter.ts   # StorageAdapter Web 实现（组合 sqlite + indexeddb）
│   ├── shared-worker.ts # SharedWorker 单写锁管理
│   └── index.ts         # 统一导出
├── search/
│   ├── fts5.ts          # FTS5 全文搜索 + 多维度组合查询
│   └── index.ts
├── utils/
│   ├── uuid.ts          # UUID 生成
│   ├── timestamp.ts     # 时间戳工具
│   └── index.ts
└── index.ts             # 统一导出

packages/web/src/
├── main.tsx             # React 入口
├── App.tsx              # 应用根组件（空壳）
├── stores/
│   ├── notesStore.ts    # 笔记 Zustand store
│   ├── foldersStore.ts  # 文件夹 Zustand store
│   ├── uiStore.ts       # UI 状态 store
│   └── index.ts
├── hooks/
│   ├── useAutoSave.ts   # 自动保存 hook
│   └── index.ts
├── styles/
│   └ globals.css        # TailwindCSS 基础样式
│   └ index.css          # 入口样式
└── lib/
    └── sqlite-init.ts   # Web 端 wa-sqlite 初始化入口
    └ index.ts

packages/core/tests/
├── models/
│   ├── note.test.ts
│   └ folder.test.ts
│   └ attachment.test.ts
│   └ tag.test.ts
│   └ search.test.ts
├── storage/
│   ├── web-adapter.test.ts
│   ├── indexeddb.test.ts
│   └ fts5.test.ts
└── utils/
    └── uuid.test.ts
```

---

### Task 0: Monorepo 基础搭建

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`

- [ ] **Step 1: 创建 root package.json 和 pnpm-workspace**

```json
// package.json
{
  "name": "notes",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5"
  },
  "packageManager": "pnpm@9.15.0"
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

- [ ] **Step 2: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

- [ ] **Step 3: 创建 tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 4: 创建 packages/core/package.json 和 tsconfig.json**

```json
// packages/core/package.json
{
  "name": "@notes/core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^3"
  },
  "dependencies": {
    "uuid": "^9"
  }
}
```

```json
// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 5: 创建 packages/web/package.json 和 tsconfig.json**

```json
// packages/web/package.json
{
  "name": "@notes/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@notes/core": "workspace:*",
    "react": "^18",
    "react-dom": "^18",
    "zustand": "^4",
    "uuid": "^9"
  },
  "devDependencies": {
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5",
    "vite": "^5",
    "vitest": "^3",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

```json
// packages/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 6: 创建 packages/web/vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@notes/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
  server: {
    port: 3000,
  },
});
```

- [ ] **Step 7: 创建 packages/web/src 空壳入口**

```typescript
// packages/web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```typescript
// packages/web/src/App.tsx
export default function App() {
  return <div>笔记应用 - 基础框架搭建中</div>;
}
```

```css
/* packages/web/src/styles/index.css */
@import "./globals.css";
```

```css
/* packages/web/src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 0;
  background-color: #fafafa;
}
```

- [ ] **Step 8: 创建 packages/web/public/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>笔记</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: 配置 TailwindCSS**

```javascript
// packages/web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

```javascript
// packages/web/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 10: 安装依赖并验证**

Run: `pnpm install`

Expected: 依赖安装成功，无错误

- [ ] **Step 11: 验证 Web 应用可启动**

Run: `cd packages/web && pnpm dev`

Expected: Vite 开发服务器在 http://localhost:3000 启动，页面显示 "笔记应用 - 基础框架搭建中"

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: 搭建 Monorepo 基础框架（Turborepo + pnpm + Vite + React + TailwindCSS）"
```

---

### Task 1: 数据模型定义

**Files:**
- Create: `packages/core/src/models/note.ts`
- Create: `packages/core/src/models/folder.ts`
- Create: `packages/core/src/models/attachment.ts`
- Create: `packages/core/src/models/tag.ts`
- Create: `packages/core/src/models/search.ts`
- Create: `packages/core/src/models/index.ts`
- Test: `packages/core/tests/models/note.test.ts`
- Test: `packages/core/tests/models/folder.test.ts`
- Test: `packages/core/tests/models/search.test.ts`

- [ ] **Step 1: 编写 Note 模型类型**

```typescript
// packages/core/src/models/note.ts

export type NoteType = "text" | "markdown" | "rich";

export interface Note {
  id: string;
  title: string;
  contentJson: string;
  mdText: string;
  folderId: string | null;
  type: NoteType;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  version: number;
}

export interface CreateNoteInput {
  title: string;
  contentJson?: string;
  mdText?: string;
  folderId?: string | null;
  type?: NoteType;
}

export interface UpdateNoteInput {
  title?: string;
  contentJson?: string;
  mdText?: string;
  folderId?: string | null;
  type?: NoteType;
  deletedAt?: number | null;
}

export function createDefaultNote(input: CreateNoteInput): Note {
  return {
    id: "",
    title: input.title,
    contentJson: input.contentJson ?? "",
    mdText: input.mdText ?? "",
    folderId: input.folderId ?? null,
    type: input.type ?? "rich",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    version: 1,
  };
}
```

- [ ] **Step 2: 编写 Note 模型测试**

```typescript
// packages/core/tests/models/note.test.ts
import { describe, it, expect } from "vitest";
import { createDefaultNote, NoteType } from "../../src/models/note";

describe("Note 模型", () => {
  it("createDefaultNote 应生成默认值", () => {
    const note = createDefaultNote({ title: "测试笔记" });
    expect(note.title).toBe("测试笔记");
    expect(note.contentJson).toBe("");
    expect(note.mdText).toBe("");
    expect(note.folderId).toBeNull();
    expect(note.type).toBe("rich");
    expect(note.deletedAt).toBeNull();
    expect(note.version).toBe(1);
  });

  it("createDefaultNote 应支持自定义输入", () => {
    const note = createDefaultNote({
      title: "自定义",
      contentJson: '{"type":"doc"}',
      mdText: "# 自定义",
      folderId: "folder-1",
      type: "markdown",
    });
    expect(note.contentJson).toBe '{"type":"doc"}');
    expect(note.mdText).toBe("# 自定义");
    expect(note.folderId).toBe("folder-1");
    expect(note.type).toBe("markdown");
  });

  it("NoteType 应包含三种类型", () => {
    const types: NoteType[] = ["text", "markdown", "rich"];
    expect(types).toHaveLength(3);
  });
});
```

- [ ] **Step 3: 运行 Note 模型测试**

Run: `cd packages/core && pnpm test`

Expected: 测试通过（注意 id 字段为空字符串，后续 StorageAdapter.createNote 会填充 UUID）

- [ ] **Step 4: 编写 Folder 模型类型**

```typescript
// packages/core/src/models/folder.ts

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  sortOrder?: number;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
  sortOrder?: number;
}

export function createDefaultFolder(input: CreateFolderInput): Folder {
  return {
    id: "",
    name: input.name,
    parentId: input.parentId ?? null,
    sortOrder: input.sortOrder ?? 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
```

- [ ] **Step 5: 编写 Attachment 模型类型**

```typescript
// packages/core/src/models/attachment.ts

export type AttachmentType = "image" | "video" | "audio" | "file";

export interface Attachment {
  id: string;
  noteId: string;
  type: AttachmentType;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: number;
}
```

- [ ] **Step 6: 编写 Tag 模型类型**

```typescript
// packages/core/src/models/tag.ts

export interface Tag {
  id: string;
  name: string;
}
```

- [ ] **Step 7: 编写 Search 模型类型**

```typescript
// packages/core/src/models/search.ts

import { NoteType } from "./note";
import { AttachmentType } from "./attachment";

export type TagFilterMode = "intersection" | "union";

export interface SearchInput {
  query?: string;
  folderId?: string;
  tagIds?: string[];
  tagMode?: TagFilterMode;
  type?: NoteType;
  hasAttachment?: AttachmentType;
  dateRange?: {
    field: "created_at" | "updated_at";
    from?: number;
    to?: number;
  };
  includeDeleted?: boolean;
  sortBy?: "updated_at" | "created_at" | "title";
  sortOrder?: "desc" | "asc";
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  notes: { id: string; title: string; updatedAt: number }[];
  total: number;
  hasMore: boolean;
}
```

- [ ] **Step 8: 编写 Search 模型测试**

```typescript
// packages/core/tests/models/search.test.ts
import { describe, it, expect } from "vitest";
import { SearchInput, SearchResult, TagFilterMode } from "../../src/models/search";

describe("Search 模型", () => {
  it("SearchInput 默认值应为 undefined", () => {
    const input: SearchInput = {};
    expect(input.query).toBeUndefined();
    expect(input.limit).toBeUndefined();
    expect(input.tagMode).toBeUndefined();
  });

  it("TagFilterMode 应包含交集和并集", () => {
    const modes: TagFilterMode[] = ["intersection", "union"];
    expect(modes).toHaveLength(2);
  });

  it("SearchResult 应包含 notes、total、hasMore", () => {
    const result: SearchResult = { notes: [], total: 0, hasMore: false };
    expect(result.notes).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});
```

- [ ] **Step 9: 编写 models/index.ts 统一导出**

```typescript
// packages/core/src/models/index.ts
export { Note, CreateNoteInput, UpdateNoteInput, NoteType, createDefaultNote } from "./note";
export { Folder, CreateFolderInput, UpdateFolderInput, createDefaultFolder } from "./folder";
export { Attachment, AttachmentType } from "./attachment";
export { Tag } from "./tag";
export { SearchInput, SearchResult, TagFilterMode } from "./search";
```

- [ ] **Step 10: 运行所有模型测试**

Run: `cd packages/core && pnpm test`

Expected: 所有模型测试通过

- [ ] **Step 11: Commit**

```bash
git add packages/core/src/models/ packages/core/tests/models/
git commit -m "feat: 定义数据模型（Note、Folder、Attachment、Tag、Search）"
```

---

### Task 2: UUID 和时间戳工具

**Files:**
- Create: `packages/core/src/utils/uuid.ts`
- Create: `packages/core/src/utils/timestamp.ts`
- Create: `packages/core/src/utils/index.ts`
- Test: `packages/core/tests/utils/uuid.test.ts`

- [ ] **Step 1: 编写 UUID 工具**

```typescript
// packages/core/src/utils/uuid.ts
import { v4 as uuidv4 } from "uuid";

export function generateId(): string {
  return uuidv4();
}
```

- [ ] **Step 2: 编写 UUID 工具测试**

```typescript
// packages/core/tests/utils/uuid.test.ts
import { describe, it, expect } from "vitest";
import { generateId } from "../../src/utils/uuid";

describe("UUID 工具", () => {
  it("generateId 应返回标准 UUID 格式", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("generateId 每次应返回不同值", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});
```

- [ ] **Step 3: 编写时间戳工具**

```typescript
// packages/core/src/utils/timestamp.ts

export function now(): number {
  return Date.now();
}

export function isExpired(deletedAt: number | null, expiryDays: number = 30): boolean {
  if (deletedAt === null) return false;
  const expiryMs = expiryDays * 24 * 60 * 60 * 1000;
  return Date.now() - deletedAt > expiryMs;
}
```

- [ ] **Step 4: 编写 utils/index.ts**

```typescript
// packages/core/src/utils/index.ts
export { generateId } from "./uuid";
export { now, isExpired } from "./timestamp";
```

- [ ] **Step 5: 运行工具测试**

Run: `cd packages/core && pnpm test`

Expected: UUID 和时间戳测试通过

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/utils/ packages/core/tests/utils/
git commit -m "feat: 添加 UUID 和时间戳工具函数"
```

---

### Task 3: StorageAdapter 接口定义

**Files:**
- Create: `packages/core/src/storage/adapter.ts`
- Create: `packages/core/src/storage/index.ts`

- [ ] **Step 1: 编写 StorageAdapter 接口**

```typescript
// packages/core/src/storage/adapter.ts
import {
  Note, CreateNoteInput, UpdateNoteInput,
  Folder, CreateFolderInput, UpdateFolderInput,
  Attachment, AttachmentType,
  Tag,
  SearchInput, SearchResult,
} from "../models";

export interface StorageAdapter {
  init(): Promise<void>;
  close(): Promise<void>;

  createNote(input: CreateNoteInput): Promise<Note>;
  updateNote(id: string, input: UpdateNoteInput): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  getNote(id: string): Promise<Note | null>;
  listNotes(folderId?: string, tagId?: string): Promise<Note[]>;

  createFolder(input: CreateFolderInput): Promise<Folder>;
  updateFolder(id: string, input: UpdateFolderInput): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  listFolders(parentId?: string | null): Promise<Folder[]>;

  saveAttachment(noteId: string, file: File, type: AttachmentType): Promise<Attachment>;
  getAttachmentBlob(id: string): Promise<Blob | null>;
  getAttachmentThumbnail(id: string): Promise<Blob | null>;
  deleteAttachment(id: string): Promise<void>;

  searchNotes(input: SearchInput): Promise<SearchResult>;

  createTag(name: string): Promise<Tag>;
  addTagToNote(noteId: string, tagId: string): Promise<void>;
  addTagsToNote(noteId: string, tagIds: string[]): Promise<void>;
  removeTagFromNote(noteId: string, tagId: string): Promise<void>;
  removeTagsFromNote(noteId: string, tagIds: string[]): Promise<void>;
  getTagsForNote(noteId: string): Promise<Tag[]>;
  listTags(): Promise<Tag[]>;
}
```

- [ ] **Step 2: 编写 storage/index.ts**

```typescript
// packages/core/src/storage/index.ts
export { StorageAdapter } from "./adapter";
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/storage/adapter.ts packages/core/src/storage/index.ts
git commit -m "feat: 定义 StorageAdapter 接口"
```

---

### Task 4: wa-sqlite 初始化与 DDL

**Files:**
- Create: `packages/core/src/storage/sqlite.ts`
- Test: `packages/core/tests/storage/sqlite.test.ts`

- [ ] **Step 1: 编写 wa-sqlite 初始化模块**

```typescript
// packages/core/src/storage/sqlite.ts
import { type SQLite3, type Sqlite3Static } from "wa-sqlite";

let sqlite3Static: Sqlite3Static | null = null;
let db: SQLite3 | null = null;

export async function initSQLite(): Promise<SQLite3> {
  if (db) return db;

  const waSqliteModule = await import("wa-sqlite");
  sqlite3Static = await waSqliteModule.default();

  db = await sqlite3Static.open_v2(
    "notes.db",
    sqlite3Static.OPEN_CREATE | sqlite3_static.OPEN_READWRITE,
    null
  );

  await executeDDL(db);
  return db;
}

export async function closeSQLite(): Promise<void> {
  if (db && sqlite3Static) {
    await sqlite3Static.close(db);
    db = null;
  }
}

export function getDB(): SQLite3 {
  if (!db) throw new Error("SQLite 未初始化，请先调用 initSQLite()");
  return db;
}

export function getStatic(): Sqlite3Static {
  if (!sqlite3Static) throw new Error("SQLite 未初始化");
  return sqlite3Static;
}

const DDL = `
CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL DEFAULT '',
  md_text TEXT NOT NULL DEFAULT '',
  folder_id TEXT REFERENCES folders(id),
  type TEXT DEFAULT 'rich',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  version INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title, content,
  content='notes',
  content_rowid='rowid',
  tokenize='simple'
);

CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(note_id);
`;

async function executeDDL(db: SQLite3): Promise<void> {
  const statements = DDL.split(";").filter((s) => s.trim());
  for (const stmt of statements) {
    await sqlite3Static!.exec(db, stmt.trim());
  }
}
```

注意：wa-sqlite 的实际 API 可能与上述略有差异，实施时需根据 wa-sqlite 包的实际导出调整。wa-sqlite 通常通过 `wa-sqlite-async` 或 `wa-sqlite/wa-sqlite-async.mjs` 导入异步版本。

- [ ] **Step 2: 编写 SQLite 初始化测试**

```typescript
// packages/core/tests/storage/sqlite.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { initSQLite, closeSQLite, getDB, getStatic } from "../../src/storage/sqlite";

describe("SQLite 初始化", () => {
  let db: any;

  beforeAll(async () => {
    db = await initSQLite();
  });

  afterAll(async () => {
    await closeSQLite();
  });

  it("initSQLite 应返回数据库实例", () => {
    expect(db).toBeDefined();
  });

  it("DDL 执行后 folders 表应存在", async () => {
    const staticApi = getStatic();
    const results: any[] = [];
    await staticApi.exec(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='folders'", (row: any) => {
      results.push(row);
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("DDL 执行后 notes 表应存在", async () => {
    const staticApi = getStatic();
    const results: any[] = [];
    await staticApi.exec(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='notes'", (row: any) => {
      results.push(row);
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("DDL 执行后 FTS5 虚拟表应存在", async () => {
    const staticApi = getStatic();
    const results: any[] = [];
    await staticApi.exec(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='notes_fts'", (row: any) => {
      results.push(row);
    });
    expect(results.length).toBeGreaterThan(0);
  });
});
```

注意：wa-sqlite 的测试需要在浏览器或 Node.js + WASM 环境中运行。Vitest 需配置 WASM 支持。如果 Vitest 默认环境不支持 WASM，需要使用 `vitest --environment happy-dom` 或在浏览器中运行。

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/storage/sqlite.ts packages/core/tests/storage/sqlite.test.ts
git commit -m "feat: 实现 wa-sqlite 初始化与 DDL 表创建"
```

---

### Task 5: IndexedDB 附件存储

**Files:**
- Create: `packages/core/src/storage/indexeddb.ts`
- Test: `packages/core/tests/storage/indexeddb.test.ts`

- [ ] **Step 1: 编写 IndexedDB 附件存储模块**

```typescript
// packages/core/src/storage/indexeddb.ts

const DB_NAME = "notes-attachments";
const DB_VERSION = 1;
const ATTACHMENTS_STORE = "attachments-store";
const THUMBNAILS_STORE = "thumbnails-store";

let dbInstance: IDBDatabase | null = null;

export async function initIndexedDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ATTACHMENTS_STORE)) {
        db.createObjectStore(ATTACHMENTS_STORE);
      }
      if (!db.objectStoreNames.contains(THUMBNAILS_STORE)) {
        db.createObjectStore(THUMBNAILS_STORE);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function closeIndexedDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await initIndexedDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ATTACHMENTS_STORE, "readwrite");
    const store = tx.objectStore(ATTACHMENTS_STORE);
    const request = store.put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await initIndexedDB();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(ATTACHMENTS_STORE, "readonly");
    const store = tx.objectStore(ATTACHMENTS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveThumbnail(id: string, blob: Blob): Promise<void> {
  const db = await initIndexedDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(THUMBNAILS_STORE, "readwrite");
    const store = tx.objectStore(THUMBNAILS_STORE);
    const request = store.put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getThumbnail(id: string): Promise<Blob | null> {
  const db = await initIndexedDB();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(THUMBNAILS_STORE, "readonly");
    const store = tx.objectStore(THUMBNAILS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await initIndexedDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([ATTACHMENTS_STORE, THUMBNAILS_STORE], "readwrite");
    tx.objectStore(ATTACHMENTS_STORE).delete(id);
    tx.objectStore(THUMBNAILS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function generateImageThumbnail(blob: Blob, maxWidth: number = 200): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(blob);

  return new Promise<Blob>((resolve, reject) => {
    img.onload = () => {
      const scale = Math.min(maxWidth / img.width, 1);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.convertToBlob({ type: "image/jpeg", quality: 0.7 }).then((thumbBlob) => {
        URL.revokeObjectURL(url);
        resolve(thumbBlob);
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };
    img.src = url;
  });
}
```

- [ ] **Step 2: 编写 IndexedDB 测试**

```typescript
// packages/core/tests/storage/indexeddb.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  initIndexedDB, closeIndexedDB,
  saveBlob, getBlob, deleteBlob,
  saveThumbnail, getThumbnail,
} from "../../src/storage/indexeddb";

describe("IndexedDB 附件存储", () => {
  beforeAll(async () => {
    await initIndexedDB();
  });

  afterAll(async () => {
    await closeIndexedDB();
  });

  it("saveBlob + getBlob 应正确存取 Blob", async () => {
    const testBlob = new Blob(["test data"], { type: "text/plain" });
    const id = "test-blob-1";

    await saveBlob(id, testBlob);
    const retrieved = await getBlob(id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.size).toBe(testBlob.size);
    expect(retrieved!.type).toBe(testBlob.type);

    await deleteBlob(id);
  });

  it("getBlob 不存在的 ID 应返回 null", async () => {
    const result = await getBlob("nonexistent-id");
    expect(result).toBeNull();
  });

  it("saveThumbnail + getThumbnail 应正确存取缩略图", async () => {
    const thumbBlob = new Blob(["thumb data"], { type: "image/jpeg" });
    const id = "test-thumb-1";

    await saveThumbnail(id, thumbBlob);
    const retrieved = await getThumbnail(id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.type).toBe("image/jpeg");

    await deleteBlob(id);
  });

  it("deleteBlob 应同时删除附件和缩略图", async () => {
    const id = "test-delete-1";
    await saveBlob(id, new Blob(["data"], { type: "text/plain" }));
    await saveThumbnail(id, new Blob(["thumb"], { type: "image/jpeg" }));

    await deleteBlob(id);

    expect(await getBlob(id)).toBeNull();
    expect(await getThumbnail(id)).toBeNull();
  });
});
```

- [ ] **Step 3: 运行 IndexedDB 测试**

Run: `cd packages/core && pnpm test`

注意：IndexedDB 测试需要 `happy-dom` 或 `jsdom` 环境。在 Vitest 配置中需设置 `environment: 'happy-dom'`。

Expected: IndexedDB 测试通过

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/storage/indexeddb.ts packages/core/tests/storage/indexeddb.test.ts
git commit -m "feat: 实现 IndexedDB 附件存储（saveBlob/getBlob/deleteBlob/缩略图）"
```

---

### Task 6: Web StorageAdapter 实现

**Files:**
- Create: `packages/core/src/storage/web-adapter.ts`
- Test: `packages/core/tests/storage/web-adapter.test.ts`

- [ ] **Step 1: 编写 Web StorageAdapter**

此文件将 `sqlite.ts` 和 `indexeddb.ts` 组合为完整的 StorageAdapter 实现。每个方法包含完整的 SQL/IndexedDB 操作代码。

```typescript
// packages/core/src/storage/web-adapter.ts
import { StorageAdapter } from "./adapter";
import { initSQLite, closeSQLite, getDB, getStatic } from "./sqlite";
import {
  initIndexedDB, closeIndexedDB,
  saveBlob, getBlob, getThumbnail, deleteBlob, saveThumbnail,
  generateImageThumbnail,
} from "./indexeddb";
import { generateId } from "../utils/uuid";
import { now } from "../utils/timestamp";
import {
  Note, CreateNoteInput, UpdateNoteInput, createDefaultNote,
  Folder, CreateFolderInput, UpdateFolderInput, createDefaultFolder,
  Attachment, AttachmentType,
  Tag,
  SearchInput, SearchResult,
} from "../models";

export class WebStorageAdapter implements StorageAdapter {
  private initialized = false;

  async init(): Promise<void> {
    await initSQLite();
    await initIndexedDB();
    this.initialized = true;
  }

  async close(): Promise<void> {
    await closeSQLite();
    await closeIndexedDB();
    this.initialized = false;
  }

  // --- 笔记 CRUD ---
  async createNote(input: CreateNoteInput): Promise<Note> {
    const note = createDefaultNote(input);
    note.id = generateId();
    const db = getDB();
    const s = getStatic();
    await s.exec(db, `INSERT INTO notes (id, title, content_json, md_text, folder_id, type, created_at, updated_at, version) VALUES ('${note.id}', '${this.escape(note.title)}', '${this.escape(note.contentJson)}', '${this.escape(note.mdText)}', ${note.folderId ? `'${note.folderId}'` : "NULL"}, '${note.type}', ${note.createdAt}, ${note.updatedAt}, ${note.version})`);
    return note;
  }

  async updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
    const existing = await this.getNote(id);
    if (!existing) throw new Error(`笔记 ${id} 不存在`);

    const updated: Note = {
      ...existing,
      ...input,
      updatedAt: now(),
      version: existing.version + 1,
    };

    const db = getDB();
    const s = getStatic();
    await s.exec(db, `UPDATE notes SET title='${this.escape(updated.title)}', content_json='${this.escape(updated.contentJson)}', md_text='${this.escape(updated.mdText)}', folder_id=${updated.folderId ? `'${updated.folderId}'` : "NULL"}, type='${updated.type}', updated_at=${updated.updatedAt}, deleted_at=${updated.deletedAt ?? "NULL"}, version=${updated.version} WHERE id='${id}'`);

    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    const db = getDB();
    const s = getStatic();
    await s.exec(db, `UPDATE notes SET deleted_at=${now()} WHERE id='${id}'`);
  }

  async getNote(id: string): Promise<Note | null> {
    const db = getDB();
    const s = getStatic();
    const results: Note[] = [];
    await s.exec(db, `SELECT * FROM notes WHERE id='${id}'`, (row: any) => {
      results.push(this.rowToNote(row));
    });
    return results[0] ?? null;
  }

  async listNotes(folderId?: string, tagId?: string): Promise<Note[]> {
    const db = getDB();
    const s = getStatic();
    let sql = "SELECT * FROM notes WHERE deleted_at IS NULL";
    if (folderId) sql += ` AND folder_id='${folderId}'`;
    sql += " ORDER BY updated_at DESC";

    const results: Note[] = [];
    await s.exec(db, sql, (row: any) => {
      results.push(this.rowToNote(row));
    });
    return results;
  }

  // --- 文件夹 CRUD ---
  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const folder = createDefaultFolder(input);
    folder.id = generateId();
    const db = getDB();
    const s = getStatic();
    await s.exec(db, `INSERT INTO folders (id, name, parent_id, sort_order, created_at, updated_at) VALUES ('${folder.id}', '${this.escape(folder.name)}', ${folder.parentId ? `'${folder.parentId}'` : "NULL"}, ${folder.sortOrder}, ${folder.createdAt}, ${folder.updatedAt})`);
    return folder;
  }

  async updateFolder(id: string, input: UpdateFolderInput): Promise<Folder> {
    const db = getDB();
    const s = getStatic();
    const existingFolders: Folder[] = [];
    await s.exec(db, `SELECT * FROM folders WHERE id='${id}'`, (row: any) => {
      existingFolders.push(this.rowToFolder(row));
    });
    const existing = existingFolders[0];
    if (!existing) throw new Error(`文件夹 ${id} 不存在`);

    const updated: Folder = { ...existing, ...input, updatedAt: now() };
    await s.exec(db, `UPDATE folders SET name='${this.escape(updated.name)}', parent_id=${updated.parentId ? `'${updated.parentId}'` : "NULL"}, sort_order=${updated.sortOrder}, updated_at=${updated.updatedAt} WHERE id='${id}'`);

    return updated;
  }

  async deleteFolder(id: string): Promise<void> {
    const db = getDB();
    const s = getStatic();
    await s.exec(db, `DELETE FROM folders WHERE id='${id}'`);
  }

  async listFolders(parentId?: string | null): Promise<Folder[]> {
    const db = getDB();
    const s = getStatic();
    let sql = "SELECT * FROM folders";
    if (parentId === null) sql += " WHERE parent_id IS NULL";
    else if (parentId) sql += ` WHERE parent_id='${parentId}'`;
    sql += " ORDER BY sort_order ASC";

    const results: Folder[] = [];
    await s.exec(db, sql, (row: any) => {
      results.push(this.rowToFolder(row));
    });
    return results;
  }

  // --- 附件 ---
  async saveAttachment(noteId: string, file: File, type: AttachmentType): Promise<Attachment> {
    const id = generateId();
    await saveBlob(id, file);

    if (type === "image") {
      try {
        const thumbnail = await generateImageThumbnail(file);
        await saveThumbnail(id, thumbnail);
      } catch {
        // 缩略图生成失败不影响主流程
      }
    }

    const attachment: Attachment = {
      id,
      noteId,
      type,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      createdAt: now(),
    };

    const db = getDB();
    const s = getStatic();
    await s.exec(db, `INSERT INTO attachments (id, note_id, type, filename, mime_type, size, created_at) VALUES ('${id}', '${noteId}', '${type}', '${this.escape(file.name)}', '${this.escape(file.type)}', ${file.size}, ${attachment.createdAt})`);

    return attachment;
  }

  async getAttachmentBlob(id: string): Promise<Blob | null> {
    return getBlob(id);
  }

  async getAttachmentThumbnail(id: string): Promise<Blob | null> {
    return getThumbnail(id);
  }

  async deleteAttachment(id: string): Promise<void> {
    await deleteBlob(id);
    const db = getDB();
    const s = getStatic();
    await s.exec(db, `DELETE FROM attachments WHERE id='${id}'`);
  }

  // --- 搜索 ---
  async searchNotes(input: SearchInput): Promise<SearchResult> {
    // 详细实现见 Task 7 (搜索模块)
    // 此处为占位，Task 7 会替换此方法
    return { notes: [], total: 0, hasMore: false };
  }

  // --- 标签 ---
  async createTag(name: string): Promise<Tag> {
    const id = generateId();
    const db = getDB();
    const s = getStatic();
    await s.exec(db, `INSERT INTO tags (id, name) VALUES ('${id}', '${this.escape(name)}')`);
    return { id, name };
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    const db = getDB();
    const s = getStatic();
    await s.exec(db, `INSERT INTO note_tags (note_id, tag_id) VALUES ('${noteId}', '${tagId}')`);
  }

  async addTagsToNote(noteId: string, tagIds: string[]): Promise<void> {
    for (const tagId of tagIds) {
      await this.addTagToNote(noteId, tagId);
    }
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    const db = getDB();
    const s = getStatic();
    await s.exec(db, `DELETE FROM note_tags WHERE note_id='${noteId}' AND tag_id='${tagId}'`);
  }

  async removeTagsFromNote(noteId: string, tagIds: string[]): Promise<void> {
    for (const tagId of tagIds) {
      await this.removeTagFromNote(noteId, tagId);
    }
  }

  async getTagsForNote(noteId: string): Promise<Tag[]> {
    const db = getDB();
    const s = getStatic();
    const results: Tag[] = [];
    await s.exec(db, `SELECT t.id, t.name FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id='${noteId}'`, (row: any) => {
      results.push({ id: row[0], name: row[1] });
    });
    return results;
  }

  async listTags(): Promise<Tag[]> {
    const db = getDB();
    const s = getStatic();
    const results: Tag[] = [];
    await s.exec(db, "SELECT id, name FROM tags ORDER BY name ASC", (row: any) => {
      results.push({ id: row[0], name: row[1] });
    });
    return results;
  }

  // --- 内部工具 ---
  private escape(str: string): string {
    return str.replace(/'/g, "''");
  }

  private rowToNote(row: any): Note {
    return {
      id: row.id,
      title: row.title,
      contentJson: row.content_json ?? "",
      mdText: row.md_text ?? "",
      folderId: row.folder_id ?? null,
      type: row.type ?? "rich",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at ?? null,
      version: row.version ?? 1,
    };
  }

  private rowToFolder(row: any): Folder {
    return {
      id: row.id,
      name: row.name,
      parentId: row.parent_id ?? null,
      sortOrder: row.sort_order ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

- [ ] **Step 2: 编写 Web StorageAdapter 测试**

```typescript
// packages/core/tests/storage/web-adapter.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebStorageAdapter } from "../../src/storage/web-adapter";

describe("WebStorageAdapter", () => {
  let adapter: WebStorageAdapter;

  beforeAll(async () => {
    adapter = new WebStorageAdapter();
    await adapter.init();
  });

  afterAll(async () => {
    await adapter.close();
  });

  describe("笔记 CRUD", () => {
    it("createNote 应创建笔记并返回完整对象", async () => {
      const note = await adapter.createNote({ title: "测试笔记", mdText: "# 测试内容" });
      expect(note.id).toBeTruthy();
      expect(note.title).toBe("测试笔记");
      expect(note.mdText).toBe("# 测试内容");
      expect(note.version).toBe(1);
    });

    it("getNote 应返回已创建的笔记", async () => {
      const created = await adapter.createNote({ title: "获取测试" });
      const retrieved = await adapter.getNote(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.title).toBe("获取测试");
    });

    it("updateNote 应更新笔记标题和版本", async () => {
      const created = await adapter.createNote({ title: "更新前" });
      const updated = await adapter.updateNote(created.id, { title: "更新后" });
      expect(updated.title).toBe("更新后");
      expect(updated.version).toBe(2);
    });

    it("deleteNote 应软删除笔记", async () => {
      const created = await adapter.createNote({ title: "待删除" });
      await adapter.deleteNote(created.id);
      const note = await adapter.getNote(created.id);
      expect(note!.deletedAt).not.toBeNull();
    });

    it("listNotes 应列出未删除的笔记", async () => {
      await adapter.createNote({ title: "列表测试" });
      const notes = await adapter.listNotes();
      expect(notes.length).toBeGreaterThan(0);
      expect(notes.every((n) => n.deletedAt === null)).toBe(true);
    });
  });

  describe("文件夹 CRUD", () => {
    it("createFolder 应创建文件夹", async () => {
      const folder = await adapter.createFolder({ name: "工作" });
      expect(folder.id).toBeTruthy();
      expect(folder.name).toBe("工作");
    });

    it("listFolders 应列出文件夹", async () => {
      await adapter.createFolder({ name: "个人" });
      const folders = await adapter.listFolders();
      expect(folders.length).toBeGreaterThan(0);
    });

    it("子文件夹应正确关联父文件夹", async () => {
      const parent = await adapter.createFolder({ name: "根目录" });
      const child = await adapter.createFolder({ name: "子目录", parentId: parent.id });
      expect(child.parentId).toBe(parent.id);

      const children = await adapter.listFolders(parent.id);
      expect(children.some((f) => f.id === child.id)).toBe(true);
    });
  });

  describe("标签 CRUD", () => {
    it("createTag 应创建标签", async () => {
      const tag = await adapter.createTag("工作");
      expect(tag.id).toBeTruthy();
      expect(tag.name).toBe("工作");
    });

    it("addTagsToNote 应给笔记添加多个标签", async () => {
      const note = await adapter.createNote({ title: "标签测试" });
      const tag1 = await adapter.createTag("重要");
      const tag2 = await adapter.createTag("紧急");
      await adapter.addTagsToNote(note.id, [tag1.id, tag2.id]);
      const tags = await adapter.getTagsForNote(note.id);
      expect(tags.length).toBe(2);
    });

    it("removeTagsFromNote 应移除笔记的多个标签", async () => {
      const note = await adapter.createNote({ title: "移除标签测试" });
      const tag1 = await adapter.createTag("待移除1");
      const tag2 = await adapter.createTag("待移除2");
      await adapter.addTagsToNote(note.id, [tag1.id, tag2.id]);
      await adapter.removeTagsFromNote(note.id, [tag1.id, tag2.id]);
      const tags = await adapter.getTagsForNote(note.id);
      expect(tags.length).toBe(0);
    });

    it("listTags 应列出所有标签", async () => {
      await adapter.createTag("标签列表测试");
      const tags = await adapter.listTags();
      expect(tags.length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 3: 运行 Web StorageAdapter 测试**

Run: `cd packages/core && pnpm test`

Expected: 所有 CRUD 测试通过

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/storage/web-adapter.ts packages/core/tests/storage/web-adapter.test.ts
git commit -m "feat: 实现 WebStorageAdapter（笔记/文件夹/附件/标签 CRUD）"
```

---

### Task 7: 搜索模块（FTS5 + 多维度组合）

**Files:**
- Create: `packages/core/src/search/fts5.ts`
- Create: `packages/core/src/search/index.ts`
- Test: `packages/core/tests/storage/fts5.test.ts`

- [ ] **Step 1: 编写 FTS5 搜索模块**

```typescript
// packages/core/src/search/fts5.ts
import { getDB, getStatic } from "../storage/sqlite";
import { SearchInput, SearchResult, Note } from "../models";

export async function searchNotes(input: SearchInput): Promise<SearchResult> {
  const db = getDB();
  const s = getStatic();

  const limit = input.limit ?? 50;
  const offset = input.offset ?? 0;
  const sortBy = input.sortBy ?? "updated_at";
  const sortOrder = input.sortOrder ?? "desc";
  const includeDeleted = input.includeDeleted ?? false;

  let whereClauses: string[] = [];

  // 全文搜索
  if (input.query) {
    whereClauses.push(`notes.id IN (SELECT rowid FROM notes_fts WHERE notes_fts MATCH '${escapeFTS(input.query)}')`);
  }

  // 删除状态
  if (!includeDeleted) {
    whereClauses.push("notes.deleted_at IS NULL");
  } else {
    whereClauses.push("notes.deleted_at IS NOT NULL");
  }

  // 文件夹筛选
  if (input.folderId) {
    whereClauses.push(`notes.folder_id='${input.folderId}'`);
  }

  // 类型筛选
  if (input.type) {
    whereClauses.push(`notes.type='${input.type}'`);
  }

  // 时间范围
  if (input.dateRange) {
    const field = input.dateRange.field;
    if (input.dateRange.from) whereClauses.push(`notes.${field} >= ${input.dateRange.from}`);
    if (input.dateRange.to) whereClauses.push(`notes.${field} <= ${input.dateRange.to}`);
  }

  // 附件筛选
  if (input.hasAttachment) {
    whereClauses.push(`EXISTS (SELECT 1 FROM attachments WHERE attachments.note_id = notes.id AND attachments.type = '${input.hasAttachment}')`);
  }

  // 标签筛选
  if (input.tagIds && input.tagIds.length > 0) {
    const tagMode = input.tagMode ?? "intersection";
    if (tagMode === "intersection") {
      // 交集：笔记必须同时包含所有指定标签
      for (const tagId of input.tagIds) {
        whereClauses.push(`EXISTS (SELECT 1 FROM note_tags WHERE note_tags.note_id = notes.id AND note_tags.tag_id = '${tagId}')`);
      }
    } else {
      // 并集：笔记包含任一标签
      const tagList = input.tagIds.map((id) => `'${id}'`).join(",");
      whereClauses.push(`EXISTS (SELECT 1 FROM note_tags WHERE note_tags.note_id = notes.id AND note_tags.tag_id IN (${tagList}))`);
    }
  }

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // 计算总数
  let total = 0;
  await s.exec(db, `SELECT COUNT(*) as cnt FROM notes ${whereStr}`, (row: any) => {
    total = row[0] ?? row.cnt ?? 0;
  });

  // 查询结果
  const notes: Note[] = [];
  await s.exec(db, `SELECT * FROM notes ${whereStr} ORDER BY ${sortBy} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`, (row: any) => {
    notes.push({
      id: row.id,
      title: row.title,
      contentJson: row.content_json ?? "",
      mdText: row.md_text ?? "",
      folderId: row.folder_id ?? null,
      type: row.type ?? "rich",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at ?? null,
      version: row.version ?? 1,
    });
  });

  return {
    notes,
    total,
    hasMore: offset + notes.length < total,
  };
}

function escapeFTS(query: string): string {
  // FTS5 特殊字符需转义
  return query.replace(/"/g, '""').replace(/'/g, "''");
}
```

- [ ] **Step 2: 编写搜索测试**

```typescript
// packages/core/tests/storage/fts5.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebStorageAdapter } from "../../src/storage/web-adapter";
import { searchNotes } from "../../src/search/fts5";

describe("FTS5 搜索模块", () => {
  let adapter: WebStorageAdapter;
  let folderId: string;
  let tag1Id: string;
  let tag2Id: string;

  beforeAll(async () => {
    adapter = new WebStorageAdapter();
    await adapter.init();

    folderId = (await adapter.createFolder({ name: "搜索测试文件夹" })).id;
    tag1Id = (await adapter.createTag("工作")).id;
    tag2Id = (await adapter.createTag("重要")).id;

    // 创建测试数据
    const n1 = await adapter.createNote({ title: "项目会议记录", mdText: "讨论了项目进度和交付时间", folderId });
    await adapter.addTagsToNote(n1.id, [tag1Id, tag2Id]);

    const n2 = await adapter.createNote({ title: "学习笔记", mdText: "今天学习了 TypeScript 类型系统", folderId });
    await adapter.addTagsToNote(n2.id, [tag1Id]);

    const n3 = await adapter.createNote({ title: "周末计划", mdText: "周末去爬山放松一下" });
  });

  afterAll(async () => {
    await adapter.close();
  });

  it("全文搜索应按关键词返回匹配笔记", async () => {
    const result = await searchNotes({ query: "项目" });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.notes.some((n) => n.title.includes("项目"))).toBe(true);
  });

  it("文件夹筛选应返回该文件夹下的笔记", async () => {
    const result = await searchNotes({ folderId });
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it("标签交集筛选应返回同时包含多个标签的笔记", async () => {
    const result = await searchNotes({ tagIds: [tag1Id, tag2Id], tagMode: "intersection" });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("标签并集筛选应返回包含任一标签的笔记", async () => {
    const result = await searchNotes({ tagIds: [tag1Id, tag2Id], tagMode: "union" });
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it("分页应正确返回 hasMore 标志", async () => {
    const result = await searchNotes({ limit: 1 });
    expect(result.hasMore).toBe(true);
  });
});
```

- [ ] **Step 3: 更新 web-adapter.ts 中的 searchNotes 方法**

将 `WebStorageAdapter` 中的 `searchNotes` 占位实现替换为调用 `fts5.ts`：

```typescript
// 在 web-adapter.ts 中
import { searchNotes as fts5Search } from "../search/fts5";

async searchNotes(input: SearchInput): Promise<SearchResult> {
  return fts5Search(input);
}
```

- [ ] **Step 4: 编写 search/index.ts**

```typescript
// packages/core/src/search/index.ts
export { searchNotes } from "./fts5";
```

- [ ] **Step 5: 运行搜索测试**

Run: `cd packages/core && pnpm test`

Expected: 搜索测试通过

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/search/ packages/core/tests/storage/fts5.test.ts packages/core/src/storage/web-adapter.ts
git commit -m "feat: 实现 FTS5 多维度组合搜索（全文/文件夹/标签/类型/附件/时间）"
```

---

### Task 8: Zustand Store 层

**Files:**
- Create: `packages/web/src/stores/notesStore.ts`
- Create: `packages/web/src/stores/foldersStore.ts`
- Create: `packages/web/src/stores/uiStore.ts`
- Create: `packages/web/src/stores/index.ts`

- [ ] **Step 1: 编写 notesStore**

```typescript
// packages/web/src/stores/notesStore.ts
import { create } from "zustand";
import { Note, CreateNoteInput, UpdateNoteInput, SearchInput, SearchResult } from "@notes/core";

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  searchResult: SearchResult | null;
  loading: boolean;
  setNotes: (notes: Note[]) => void;
  setCurrentNote: (note: Note | null) => void;
  addNote: (note: Note) => void;
  updateNoteInList: (id: string, note: Note) => void;
  removeNoteFromList: (id: string) => void;
  setSearchResult: (result: SearchResult | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  currentNote: null,
  searchResult: null,
  loading: false,
  setNotes: (notes) => set({ notes }),
  setCurrentNote: (note) => set({ currentNote: note }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNoteInList: (id, note) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? note : n)),
    })),
  removeNoteFromList: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    })),
  setSearchResult: (result) => set({ searchResult: result }),
  setLoading: (loading) => set({ loading }),
}));
```

- [ ] **Step 2: 编写 foldersStore**

```typescript
// packages/web/src/stores/foldersStore.ts
import { create } from "zustand";
import { Folder, CreateFolderInput } from "@notes/core";

interface FoldersState {
  folders: Folder[];
  currentFolderId: string | null;
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  setCurrentFolderId: (id: string | null) => void;
}

export const useFoldersStore = create<FoldersState>((set) => ({
  folders: [],
  currentFolderId: null,
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  removeFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    })),
  setCurrentFolderId: (id) => set({ currentFolderId: id }),
}));
```

- [ ] **Step 3: 编写 uiStore**

```typescript
// packages/web/src/stores/uiStore.ts
import { create } from "zustand";

interface UIState {
  theme: "light" | "dark";
  editorMode: "wysiwyg" | "markdown";
  sidebarOpen: boolean;
  isMobile: boolean;
  setTheme: (theme: "light" | "dark") => void;
  setEditorMode: (mode: "wysiwyg" | "markdown") => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  editorMode: "wysiwyg",
  sidebarOpen: true,
  isMobile: false,
  setTheme: (theme) => set({ theme }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
}));
```

- [ ] **Step 4: 编写 stores/index.ts**

```typescript
// packages/web/src/stores/index.ts
export { useNotesStore } from "./notesStore";
export { useFoldersStore } from "./foldersStore";
export { useUIStore } from "./uiStore";
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/stores/
git commit -m "feat: 添加 Zustand store 层（笔记/文件夹/UI 状态）"
```

---

### Task 9: 自动保存 Hook

**Files:**
- Create: `packages/web/src/hooks/useAutoSave.ts`
- Create: `packages/web/src/hooks/index.ts`

- [ ] **Step 1: 编写 useAutoSave hook**

```typescript
// packages/web/src/hooks/useAutoSave.ts
import { useEffect, useRef, useCallback } from "react";
import { useNotesStore } from "../stores";

export function useAutoSave(
  noteId: string,
  content: { contentJson: string; mdText: string; title: string },
  debounceMs: number = 500
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateNoteInList = useNotesStore((s) => s.updateNoteInList);

  const save = useCallback(async () => {
    // 实际保存逻辑在 StorageAdapter 交互层实现
    // 此 hook 负责 debounce 和触发保存事件
    updateNoteInList(noteId, {
      ...content,
      id: noteId,
      updatedAt: Date.now(),
      version: 0, // 由 StorageAdapter 递增
      createdAt: 0, // 由 StorageAdapter 保留
      folderId: null,
      type: "rich",
      deletedAt: null,
    });
  }, [noteId, content, updateNoteInList]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(save, debounceMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [content, debounceMs, save]);
}
```

- [ ] **Step 2: 编写 hooks/index.ts**

```typescript
// packages/web/src/hooks/index.ts
export { useAutoSave } from "./useAutoSave";
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/
git commit -m "feat: 添加 useAutoSave 自动保存 hook"
```

---

### Task 10: core 包统一导出 + Vitest 配置

**Files:**
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/vitest.config.ts`
- Modify: `packages/core/package.json` (添加 happy-dom)

- [ ] **Step 1: 编写 core/src/index.ts**

```typescript
// packages/core/src/index.ts
export * from "./models";
export * from "./storage";
export * from "./search";
export * from "./utils";
```

- [ ] **Step 2: 创建 vitest.config.ts**

```typescript
// packages/core/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
  },
});
```

- [ ] **Step 3: 添加 happy-dom 到 core package.json devDependencies**

在 `packages/core/package.json` 的 `devDependencies` 中添加：
```json
"happy-dom": "^15"
```

- [ ] **Step 4: 安装依赖**

Run: `pnpm install`

- [ ] **Step 5: 运行全部 core 测试**

Run: `cd packages/core && pnpm test`

Expected: 所有测试通过

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 完善核心包导出和 Vitest 配置（happy-dom 环境）"
```

---

### Task 11: Web 端 StorageAdapter 初始化入口

**Files:**
- Create: `packages/web/src/lib/sqlite-init.ts`
- Create: `packages/web/src/lib/index.ts`

- [ ] **Step 1: 编写 sqlite-init.ts**

```typescript
// packages/web/src/lib/sqlite-init.ts
import { WebStorageAdapter } from "@notes/core";

let adapter: WebStorageAdapter | null = null;

export async function initStorage(): Promise<WebStorageAdapter> {
  if (adapter) return adapter;
  adapter = new WebStorageAdapter();
  await adapter.init();
  return adapter;
}

export function getStorage(): WebStorageAdapter {
  if (!adapter) throw new Error("存储未初始化，请先调用 initStorage()");
  return adapter;
}

export async function closeStorage(): Promise<void> {
  if (adapter) {
    await adapter.close();
    adapter = null;
  }
}
```

- [ ] **Step 2: 编写 lib/index.ts**

```typescript
// packages/web/src/lib/index.ts
export { initStorage, getStorage, closeStorage } from "./sqlite-init";
```

- [ ] **Step 3: 在 App.tsx 中初始化存储**

```typescript
// packages/web/src/App.tsx
import { useEffect, useState } from "react";
import { initStorage } from "./lib";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initStorage().then(() => setReady(true));
  }, []);

  if (!ready) return <div>正在初始化...</div>;

  return <div>笔记应用 - 数据层就绪</div>;
}
```

- [ ] **Step 4: 验证 Web 应用可启动且初始化存储**

Run: `cd packages/web && pnpm dev`

Expected: 页面先显示"正在初始化..."，然后变为"笔记应用 - 数据层就绪"

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/ packages/web/src/App.tsx
git commit -m "feat: Web 端 StorageAdapter 初始化入口 + App 启动时自动初始化"
```

---

## 自审

### 1. 规格覆盖检查

| 规格章节 | 覆盖的 Task |
|----------|-------------|
| 数据模型（Note/Folder/Attachment/Tag/Search） | Task 1 |
| StorageAdapter 接口 | Task 3 |
| wa-sqlite DDL | Task 4 |
| IndexedDB 附件存储 | Task 5 |
| Web StorageAdapter 实现 | Task 6 |
| 标签可选+多选 | Task 6（note_tags 多对多 + addTagsToNote/removeTagsFromNote） |
| 搜索多维度 | Task 7 |
| 多标签页 SharedWorker | **未覆盖** → 需后续 Task |
| Zustand Store | Task 8 |
| 自动保存 | Task 9 |
| Vitest 配置 | Task 10 |
| Web 端初始化 | Task 11 |

**缺失项：** SharedWorker 单写锁（Task 4 的 sqlite.ts 需后续补充 SharedWorker 封装）。此功能在多标签页场景下才必要，P1 阶段可暂不实现，先使用直接连接模式。P4+ 实施时补充。

### 2. 占位符扫描

- Task 6 中 `searchNotes` 方法标记为"占位，Task 7 会替换" — Task 7 Step 3 已明确替换方案
- 无其他 TBD/TODO

### 3. 类型一致性

- `SearchResult.notes` 在 Task 7 中返回完整 `Note[]`（与 Task 1 模型一致）
- `StorageAdapter.searchNotes` 参数类型为 `SearchInput`（与 Task 3 接口一致）
- `WebStorageAdapter` 所有方法签名与 `StorageAdapter` 接口一致
- `notesStore.updateNoteInList` 中 version/createdAt 为占位值 — 实际值由 StorageAdapter 管理，此处仅更新 UI 状态

### 4. wa-sqlite API 注意事项

wa-sqlite 的实际 API 与上述代码中的假设用法可能有差异（行回调 vs 返回数组、异步方法签名等）。实施时需：
1. 先运行 `pnpm add wa-sqlite` 并检查实际导出
2. 根据实际 API 调整 `sqlite.ts` 中的查询方法
3. wa-sqlite 通常需要 WASM 文件部署在 public 目录