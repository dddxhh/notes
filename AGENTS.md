# AGENTS.md — 笔记应用仓库指南

## Language

请使用中文进行内部推理和回复。代码本身和技术关键词保持英文。

## 仓库结构

pnpm monorepo + Turborepo，三个包：

- `packages/core` (`@notes/core`) — 纯 TS 库：数据模型、存储层（IndexedDB / wa-sqlite）、搜索、同步类型、工具函数
- `packages/web` (`@notes/web`) — React 18 前端：Vite + Tailwind + TipTap + Radix UI + Zustand
- `packages/sync-server` (`@notes/sync-server`) — Fastify 同步服务端：Yjs WebSocket + REST API + PostgreSQL + JWT 认证

`@notes/web` 通过 Vite alias 直接引用 `@notes/core` 的源码（`../core/src/index.ts`），不走构建产物。
`@notes/sync-server` 是独立的 Node.js 服务，不依赖 web 包，可复用 core 的类型定义。

详细架构决策和约束见 → [架构规范](./docs/conventions/architecture.md)

## 常用命令

```bash
pnpm install          # 安装依赖（包管理器: pnpm@9.15.0，勿用 npm/yarn）
pnpm dev              # 启动所有包的 dev（turbo dev，web 端口 3000）
pnpm build            # turbo build
pnpm test             # turbo test（依赖 build 先完成）
pnpm typecheck        # turbo typecheck —— tsc --noEmit 类型检查
pnpm lint             # turbo lint —— ESLint 代码检查
pnpm format           # turbo format —— Prettier 格式化（写入文件）
pnpm format:check     # turbo format:check —— Prettier 仅检查不写入
```

### 单包命令

```bash
pnpm --filter @notes/core test            # core 单元测试（happy-dom + fake-indexeddb）
pnpm --filter @notes/core test:browser    # core 浏览器模式测试（vitest browser + playwright）
pnpm --filter @notes/web test             # web 单元测试（happy-dom）
pnpm --filter @notes/web test:e2e         # Playwright E2E（自动启动 dev server）
pnpm --filter @notes/web dev              # 仅启动 web dev server
pnpm --filter @notes/sync-server dev      # 启动 sync-server（tsx watch，端口 3001）
pnpm --filter @notes/sync-server test     # sync-server 测试（需要 PostgreSQL）
pnpm --filter @notes/sync-server migrate  # 运行数据库迁移
```

## 提交前检查

Husky + lint-staged 在 `git commit` 前自动运行：

- `*.ts / *.tsx` → ESLint --fix + Prettier --write
- `*.json / *.js / *.css / *.md` → Prettier --write

手动跑完整检查：`typecheck → lint → format:check → test`

详细流程和陷阱见 → [开发流程规范](./docs/conventions/workflow.md)

## 规范文档索引

| 文档                                                | 内容                                                            |
| --------------------------------------------------- | --------------------------------------------------------------- |
| [架构规范](./docs/conventions/architecture.md)      | 三包边界、存储层架构、attachment 协议、状态管理分工、云同步架构 |
| [开发流程规范](./docs/conventions/workflow.md)      | 提交检查流程、新增功能流程、测试运行、常见陷阱                  |
| [组件使用规范](./docs/conventions/components.md)    | 组件定义/目录/导入规范、Store 使用模式、Hook/Lib 分工           |
| [TypeScript 规范](./docs/conventions/typescript.md) | interface vs type、命名约定、可空字段、import type、barrel 导出 |
| [样式规范](./docs/conventions/styles.md)            | 主题系统（CSS 变量）、混合样式写法、深色模式、globals.css 组织  |

## 关键注意事项

- **wa-sqlite 需要 COOP/COEP 头**：Vite dev server 和 vitest browser config 都设了 `Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`，这是为 SharedArrayBuffer（wa-sqlite 依赖）。不要去掉这些头。
- **core 浏览器测试**：`test:browser` 用 `vitest.config.browser.ts`，跑的是 `tests/browser/**/*.test.ts`，需要 playwright。普通 `test` 排除了 browser 目录。
- **E2E 测试前提**：Playwright 配置了 webServer 自动启动 `pnpm dev`，CI 下不复用已有 server。本地可复用。
- **ESLint flat config**：`eslint.config.js` 在根目录，使用 typescript-eslint + react-hooks（FlatCompat）+ prettier 冲突关闭。
- **sync-server 需要 PostgreSQL**：开发环境用 `docker compose -f packages/sync-server/docker-compose.yml up -d db` 启动，迁移用 `pnpm --filter @notes/sync-server migrate`。sync-server 测试在无数据库时自动跳过集成测试。
- **sync-server 环境变量**：运行测试/服务需要 `DATABASE_URL`、`JWT_SECRET`、`JWT_REFRESH_SECRET`，可选 `ATTACHMENT_DIR`、`PORT`。参考 `packages/sync-server/.env.example`。

## 文件组织惯例

- core 测试：`packages/core/tests/` 按子模块分目录（storage/、models/、utils/），browser 测试在 `tests/browser/`
- web 测试：`packages/web/tests/` 按类型分目录（shared/、desktop/、mobile/、hooks/、stores/、lib/、styles/）
- E2E 测试：`packages/web/e2e/`，`.spec.ts` 后缀
- sync-server 测试：`packages/sync-server/src/` 与源码同目录（`*.test.ts` 后缀），集成测试需 PostgreSQL
