# P5 — 生产可用 Web 应用 设计规格

**日期:** 2026-05-27
**状态:** 已审阅 — 待实施
**依赖:** P0–P4 已完成

## 概述

P5 的目标是让笔记应用达到生产可用级别。三个子功能按优先级排列：

1. **回收站 UI 集成** — 后端已完整，只需将 TrashView 组件接入布局
2. **PWA + 离线支持** — 安装 vite-plugin-pwa，配置 manifest 和 service worker
3. **数据导出/导入** — core 层新增 dumpAll/restoreAll，web 层实现 JSON 转储和 Markdown 包

## 1. 回收站 UI 集成

### 1.1 桌面端

**Sidebar 入口**：在 Sidebar 底部区域（ThemeToggle 右侧）添加回收站图标按钮，点击调用 `uiStore.setShowTrash(true)`。

**DesktopLayout 主区域**：当 `showTrash === true` 时，主区域渲染 TrashView 替代 NoteView/QuickNote。点击 TrashView 的关闭按钮 → `setShowTrash(false)` → 恢复之前的视图。

**视图状态保存**：进入回收站时保存当前视图状态（`currentNote` 或 `quickNote`），退出时恢复。

### 1.2 移动端

**MobileDrawer 入口**：在 Drawer 内容底部添加"回收站"链接行，点击 → 关闭 Drawer + `setShowTrash(true)`。

**MobileLayout 渲染**：当 `showTrash === true` 时，叠加渲染 TrashView（覆盖当前屏幕），关闭后回到之前的 screenState。不修改 ScreenState 类型——回收站是临时覆盖层而非常驻 tab。

### 1.3 TrashView 改进

- 内联确认对话框（当前用 `<div style="z-index: 100">`）改为 Radix AlertDialog（项目已有此依赖）
- 关闭按钮只调 `setShowTrash(false)`，视图恢复逻辑由布局层控制
- 30 天自动过期提示：在每条已删除笔记上显示剩余天数（基于 `deletedAt` + `isExpired` 工具函数）

### 1.4 变更范围

仅 `@notes/web` 层，不改 core：

- `packages/web/src/components/desktop/Sidebar.tsx` — 添加回收站图标按钮
- `packages/web/src/components/layouts/DesktopLayout.tsx` — 条件渲染 TrashView
- `packages/web/src/components/mobile/MobileDrawer.tsx` — 添加回收站链接
- `packages/web/src/components/layouts/MobileLayout.tsx` — 条件渲染 TrashView
- `packages/web/src/components/shared/TrashView.tsx` — 改用 Radix AlertDialog

## 2. PWA + 离线支持

### 2.1 新增依赖

```bash
pnpm --filter @notes/web add -D vite-plugin-pwa
```

### 2.2 vite.config.ts 配置

在现有 plugins 数组中添加 `VitePWA` 插件：

```ts
import VitePWA from "vite-plugin-pwa";

plugins: [
  react(),
  VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["favicon.ico", "icons/*.png"],
    manifest: {
      name: "笔记",
      short_name: "笔记",
      start_url: "/",
      display: "standalone",
      background_color: "#fafafa",
      theme_color: "#3b82f6",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm}"],
      navigateFallback: "index.html",
    },
  }),
];
```

`registerType: 'autoUpdate'` 会自动在 `main.tsx` 注入 SW 注册代码，无需手写。

### 2.3 需创建的文件

- `packages/web/public/icons/icon-192.png` — 应用图标 192x192
- `packages/web/public/icons/icon-512.png` — 应用图标 512x512
- `packages/web/public/favicon.ico` — favicon
- `packages/web/public/robots.txt` — `User-agent: * \n Allow: /`

图标使用简单设计：蓝色背景 + 白色"笔"符号。可用 SVG 转 PNG。

### 2.4 index.html 更新

在 `<head>` 中添加：

```html
<meta name="theme-color" content="#3b82f6" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

manifest 的 `<link>` 由 vite-plugin-pwa 自动注入。

### 2.5 离线策略

| 资源类型               | 策略             | 说明                           |
| ---------------------- | ---------------- | ------------------------------ |
| 静态资源 (JS/CSS/HTML) | Workbox precache | 自动缓存所有构建产物           |
| wa-sqlite WASM         | Workbox precache | globPatterns 包含 `*.wasm`     |
| 应用图标/favicon       | Workbox precache | includeAssets 配置             |
| 用户数据               | 本地存储         | IndexedDB + wa-sqlite 天然离线 |
| SPA 路由               | navigateFallback | `index.html` 回退              |

### 2.6 数据持久性

首次访问时请求持久存储权限：

```ts
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then((granted) => {
    if (!granted) {
      // 显示提示：建议授予持久存储权限
    }
  });
}
```

在设置面板中显示存储使用情况：

```ts
const estimate = await navigator.storage.estimate();
// estimate.usage / estimate.quota
```

### 2.7 变更范围

- `packages/web/vite.config.ts` — 添加 VitePWA 插件
- `packages/web/package.json` — 添加 vite-plugin-pwa devDependency
- `packages/web/public/` — 创建图标、favicon、robots.txt
- `packages/web/index.html` — 添加 PWA meta tags
- `packages/web/src/App.tsx` — 添加 `navigator.storage.persist()` 调用

## 3. 数据导出/导入

### 3.1 core 层新增

**StorageAdapter 接口扩展** (`packages/core/src/storage/adapter.ts`)：

```ts
dumpAll(): Promise<DataDump>
restoreAll(dump: DataDump): Promise<void>
```

**DataDump 类型** (`packages/core/src/models/data-dump.ts`)：

```ts
interface DataDump {
  version: 1;
  exportedAt: number;
  folders: Folder[];
  notes: Note[];
  tags: Tag[];
  noteTags: { noteId: string; tagId: string }[];
  attachments: Attachment[];
  attachmentBlobs: { id: string; mimeType: string; data: ArrayBuffer }[];
  thumbnails: { id: string; data: ArrayBuffer }[];
}
```

**WebStorageAdapter 实现** (`packages/core/src/storage/web-adapter.ts`)：

- `dumpAll()`：遍历 SQLite 所有表（notes/folders/tags/note_tags/attachments，不含 FTS 虚表）+ IndexedDB 所有 blob/thumbnail，返回完整 DataDump。notes 查询用 `WHERE deleted_at IS NULL`（仅导出正常笔记，回收站内容不导出）。
- `restoreAll()`：先清空现有数据（DELETE 所有表 + 清空 IndexedDB stores）→ 批量 INSERT SQLite + 逐个写入 IndexedDB blobs → 重建 FTS。

### 3.2 web 层新增

**新增依赖**：`fflate`（轻量 zip 库，~8KB gzip）

```bash
pnpm --filter @notes/web add fflate
```

#### 导出功能 (`packages/web/src/lib/export.ts`)

**JSON 转储导出**：

1. 调用 `storage.dumpAll()`
2. 序列化为 JSON（attachmentBlobs 中的 ArrayBuffer 转 base64）
3. 生成 Blob，触发下载 `笔记-备份-{YYYY-MM-DD}.json`

**Markdown 包导出**：

1. 调用 `storage.dumpAll()`
2. 遍历 notes，每条生成 .md 文件（mdText 字段），文件名 = `{title}.md`（标题重复时加 ID 后缀）
3. 文件夹结构映射：每个 folder → 子目录，无 folder 的笔记 → 根目录
4. 每个 .md 文件的 frontmatter 包含 `created`、`updated`（ISO 8601）和 `tags` 字段，以保留原始时间戳和标签
5. zip 内包含 `metadata.json`，存储所有 folders（含空文件夹及层级关系）和所有 tags（含未使用的标签），作为导入时的权威数据源
6. frontmatter tag 格式为 `tags:\n- name`（无缩进），兼容 Obsidian；导入解析同时支持缩进格式和 YAML inline 数组
7. 附件放 `attachments/` 子目录，文件名 = `{attachmentId}.{ext}`
8. fflate 打包为 zip → 触发下载 `笔记-{YYYY-MM-DD}.zip`

格式兼容 Obsidian 导入（.md 文件 + 附件文件夹）。`metadata.json` 为自导出 zip 的完整恢复提供保障，不含 `metadata.json` 的 zip（如 Obsidian 导出）仍可通过目录结构和 frontmatter 回退解析。

#### 导入功能 (`packages/web/src/lib/import.ts`)

**格式自动检测**：

- `.json` 文件 → JSON 转储
- `.zip` 文件 → Markdown 包
- `.md` 文件（单文件）→ 创建独立 Note

**JSON 转储导入**：

1. 读取文件 → JSON.parse
2. 校验 `DataDump.version === 1`
3. base64 转 ArrayBuffer（attachmentBlobs/thumbnails）
4. 显示确认："导入将替换所有现有数据，确定继续？"
5. 调用 `storage.restoreAll(dump)`
6. 重新加载 stores（notesStore/foldersStore/tagsStore）

**Markdown 包导入 (zip)**：

1. fflate 解压
2. 优先读取 `metadata.json`：若存在，从中获取 folders（含原始 ID 和层级）和 tags（含未使用标签），作为权威数据源
3. 无 `metadata.json` 时回退：从目录结构推断 folder 层级，从 frontmatter/inline `#tag` 推断 tags
4. 为每个 .md 创建 Note，frontmatter 中的 `created`/`updated` 字段还原原始时间戳（无时间字段则用当前时间）
5. 扫描 `attachments/` 目录 → 附件写入 IndexedDB
6. 关联 note_tags：有 metadata 时用原始 tag ID 匹配 frontmatter 标签名；无 metadata 时用 `tag-{tagName}` 格式

**散 Markdown 文件导入**：

1. 批量选择多个 .md 文件
2. 每个文件创建一条独立 Note（无 folder）
3. 使用 markdown-serializer 的 `markdownToProseMirrorJSON` 解析内容

### 3.3 UI 入口

**桌面端**：新增 `DataManagementPanel` 组件（shared/），通过 Sidebar 底部齿轮图标打开为覆盖层。

**移动端**：替换 MobileSettings 中的"导入/导出功能开发中…"占位为 `ExportPanel` + `ImportPanel`。

**共享组件** (`packages/web/src/components/shared/`)：

- `ExportPanel.tsx` — 选择导出格式（JSON / Markdown 包），触发导出，显示进度
- `ImportPanel.tsx` — 文件选择器（支持 .json / .zip / .md），格式自动检测，确认对话框，进度指示器

**进度指示器**：导出/导入操作可能耗时（大量笔记+附件），使用简单的进度条 + 百分比文字。

**错误处理**：

- 文件格式不匹配 → toast 提示"不支持的文件格式"
- DataDump version 不匹配 → toast 提示"备份版本不兼容"
- 导入中断 → rollback（restoreAll 在事务中执行）

### 3.4 导入冲突策略

MVP 仅实现"覆盖"模式：导入前清空所有数据 → 恢复备份。

"合并"模式（ID 映射 + 冲突检测）延后到后续阶段。

导入前必须显示确认对话框（Radix AlertDialog）：

> "导入将替换所有现有数据。建议先导出当前数据作为备份。确定继续？"

### 3.5 变更范围

**core 层**：

- `packages/core/src/models/data-dump.ts` — 新增 DataDump 类型
- `packages/core/src/storage/adapter.ts` — 接口新增 dumpAll/restoreAll
- `packages/core/src/storage/web-adapter.ts` — 实现 dumpAll/restoreAll
- `packages/core/src/index.ts` — 导出 DataDump

**web 层**：

- `packages/web/src/lib/export.ts` — 新增导出函数
- `packages/web/src/lib/import.ts` — 新增导入函数
- `packages/web/src/components/shared/ExportPanel.tsx` — 新增
- `packages/web/src/components/shared/ImportPanel.tsx` — 新增
- `packages/web/src/components/mobile/MobileSettings.tsx` — 替换占位为实际组件
- `packages/web/src/components/desktop/Sidebar.tsx` — 添加齿轮图标入口
- `packages/web/src/components/layouts/DesktopLayout.tsx` — DataManagementPanel 覆盖层
- `packages/web/src/hooks/useStorage.ts` — 新增 dumpAll/restoreAll wrappers

## 实施顺序

| 序号 | 任务                    | 预估工作量                               |
| ---- | ----------------------- | ---------------------------------------- |
| 1    | 回收站 UI 集成          | 小（5个文件改动）                        |
| 2    | PWA 配置                | 中（新增依赖+配置+图标）                 |
| 3    | core dumpAll/restoreAll | 中（新增模型+接口+实现）                 |
| 4    | web 导出功能            | 中（export.ts + ExportPanel）            |
| 5    | web 导入功能            | 中（import.ts + ImportPanel）            |
| 6    | 设置入口集成            | 小（MobileSettings替换+DesktopSettings） |

## 测试要求

- 回收站：验证 TrashView 在桌面/移动端可见，恢复/彻底删除功能正常
- PWA：验证 manifest 生效、SW 注册成功、离线模式可用
- 导出：JSON 转储导出 → 导入回来数据完整；Markdown 包导出 → 可在 Obsidian 打开
- 导入：导入 JSON → 数据正确恢复；导入 zip → 笔记+附件完整；导入 .md → 单条笔记创建
