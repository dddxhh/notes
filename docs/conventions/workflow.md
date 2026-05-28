# 开发流程规范

> 修改代码后必须按此流程验证，lint-staged 在提交前仅做增量检查，完整验证需手动执行。

## 提交前完整检查

```
pnpm typecheck → pnpm lint → pnpm format:check → pnpm test
```

顺序有讲究：typecheck 最快发现问题；lint 检查代码质量；format:check 确保格式一致；test 依赖 build（turbo 自动处理）。

## lint-staged 自动检查

`git commit` 时 Husky + lint-staged 自动对暂存文件运行：

- `*.ts / *.tsx` → `eslint --fix` + `prettier --write`
- `*.json / *.js / *.css / *.md` → `prettier --write`

仅检查暂存文件，不会修复未暂存的错误。如果提交失败，修复后重新 `git add` 再提交。

## 新增功能开发流程

1. **core 先行**：新增数据模型或存储操作时，先在 `packages/core` 定义类型和 adapter 方法，再在 web 侧接入。
2. **先写类型**：定义 `interface Xxx` / `CreateXxxInput` / `UpdateXxxInput`，再写实现。
3. **单包验证**：改 core 用 `pnpm --filter @notes/core test`，改 web 用 `pnpm --filter @notes/web test`。
4. **跨包验证**：改 core 后必须跑 `pnpm typecheck`（web 引用 core 类型）。

## sync-server 本地开发环境

sync-server 需要 PostgreSQL 才能运行。首次搭建：

```bash
# 1. 启动 PostgreSQL
docker compose -f packages/sync-server/docker-compose.yml up -d db

# 2. 创建 .env 文件
cp packages/sync-server/.env.example packages/sync-server/.env
```

编辑 `packages/sync-server/.env`（开发环境默认值即可）：

```
DATABASE_URL=postgres://notes:notes@localhost:5432/notes_sync
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret
PORT=3001
ATTACHMENT_DIR=./data/attachments
```

```bash
# 3. 运行数据库迁移（首次 + schema 变更后）
pnpm --filter @notes/sync-server migrate

# 4. 启动开发（web 端口 3000 + sync-server 端口 3001）
pnpm dev
```

如果 `pnpm dev` 启动 sync-server 报环境变量错误，可单独在另一个终端启动：

```bash
cd packages/sync-server && source .env && pnpm dev
```

在 web 的设置面板中输入 `http://localhost:3001` 作为服务端地址，注册/登录后即可调试同步功能。

## 测试运行

| 场景                                | 命令                                     |
| ----------------------------------- | ---------------------------------------- |
| 全量测试                            | `pnpm test`                              |
| core 单元测试                       | `pnpm --filter @notes/core test`         |
| core 浏览器测试（需要 playwright）  | `pnpm --filter @notes/core test:browser` |
| web 单元测试                        | `pnpm --filter @notes/web test`          |
| E2E（自动启动 dev server）          | `pnpm --filter @notes/web test:e2e`      |
| sync-server 测试（需要 PostgreSQL） | `pnpm --filter @notes/sync-server test`  |

注意：core 普通测试排除 `tests/browser/**`，浏览器测试排除普通目录，二者互不干扰。sync-server 集成测试在无 PostgreSQL 时自动跳过（`describe.skipIf`），不影响其他包。

## 常见陷阱

- **不要去掉 Vite / vitest browser 的 COOP/COEP 头**：SharedArrayBuffer 依赖这些头，去掉后 wa-sqlite 无法运行。
- **不要用 npm 或 yarn**：包管理器锁定为 pnpm@9.15.0。
- **core package.json 的 `main` 和 `types` 指向源码**：`./src/index.ts`，不是 dist。web 通过 alias 直接读源码。
- **E2E 在 CI 下不复用已有 dev server**：本地开发时可手动复用。
