# Sync Server 部署指南

## 概述

sync-server 是一个 Fastify + PostgreSQL 的 Node.js 服务，提供：

- JWT 认证（access token 1h + refresh token 30d）
- Yjs WebSocket 实时文档同步
- REST API 元数据同步
- 附件上传（最大 50MB）

## 环境要求

| 依赖       | 最低版本 | 说明             |
| ---------- | -------- | ---------------- |
| Node.js    | 20+      | 推荐 LTS         |
| pnpm       | 9.15+    | 包管理器         |
| PostgreSQL | 16+      | 数据库           |
| Docker     | 24+      | 可选，容器化部署 |

## 环境变量

| 变量                 | 必填 | 默认值               | 说明                   |
| -------------------- | ---- | -------------------- | ---------------------- |
| `DATABASE_URL`       | 是   | -                    | PostgreSQL 连接字符串  |
| `JWT_SECRET`         | 是   | -                    | access token 签名密钥  |
| `JWT_REFRESH_SECRET` | 是   | -                    | refresh token 签名密钥 |
| `PORT`               | 否   | `3001`               | 服务监听端口           |
| `ATTACHMENT_DIR`     | 否   | `./data/attachments` | 附件存储路径           |

生成强密钥：

```bash
openssl rand -base64 32
```

## 方式一：Docker Compose 部署（推荐）

### 1. 准备配置文件

```bash
# 克隆代码
git clone <repo-url> notes && cd notes

# 创建生产环境 compose 文件
cat > docker-compose.prod.yml << 'EOF'
services:
  server:
    build:
      context: .
      dockerfile: packages/sync-server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://notes:${DB_PASSWORD}@db:5432/notes_sync
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      PORT: "3001"
      ATTACHMENT_DIR: /data/attachments
    volumes:
      - attachments:/data/attachments
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: notes_sync
      POSTGRES_USER: notes
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U notes -d notes_sync"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
  attachments:
EOF
```

### 2. 创建 `.env` 文件

```bash
cat > .env << EOF
DB_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
EOF
```

### 3. 启动服务

```bash
# 构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 运行数据库迁移（首次部署）
docker compose -f docker-compose.prod.yml exec server \
  node -e "import('./dist/db/migrate.js')"

# 查看日志
docker compose -f docker-compose.prod.yml logs -f server
```

### 4. 验证

```bash
curl http://localhost:3001/health
# {"status":"ok"}
```

## 方式二：手动部署

### 1. 安装依赖

```bash
git clone <repo-url> notes && cd notes
pnpm install
```

### 2. 配置环境变量

```bash
cp packages/sync-server/.env.example packages/sync-server/.env
# 编辑 .env，填入强密钥和数据库连接
```

### 3. 启动 PostgreSQL

```bash
# 使用 Docker
docker compose -f packages/sync-server/docker-compose.yml up -d db

# 或使用已有 PostgreSQL，确保数据库已创建
psql -U postgres -c "CREATE DATABASE notes_sync;"
psql -U postgres -c "CREATE USER notes WITH PASSWORD 'your-password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE notes_sync TO notes;"
```

### 4. 运行迁移

```bash
pnpm --filter @notes/sync-server migrate
```

### 5. 构建并启动

```bash
pnpm --filter @notes/sync-server build
pnpm --filter @notes/sync-server start
```

### 6. 使用 PM2 守护进程（可选）

```bash
npm install -g pm2
pm2 start packages/sync-server/dist/server.js --name notes-sync
pm2 save
pm2 startup
```

## 反向代理配置

生产环境建议配置 HTTPS + WSS。

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name sync.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Caddy（自动 HTTPS）

```caddyfile
sync.example.com {
    reverse_proxy localhost:3001
}
```

## 数据库备份

```bash
# 手动备份
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U notes notes_sync > backup_$(date +%Y%m%d).sql

# 恢复
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db \
  psql -U notes -d notes_sync

# 定时备份（crontab）
0 2 * * * docker compose -f /path/to/docker-compose.prod.yml exec db \
  pg_dump -U notes notes_sync | gzip > /backup/notes_$(date +\%Y\%m\%d).sql.gz
```

## 升级步骤

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
docker compose -f docker-compose.prod.yml up -d --build server

# 3. 运行迁移（如有）
docker compose -f docker-compose.prod.yml exec server \
  node -e "import('./dist/db/migrate.js')"
```

## Yjs 更新压缩

定期压缩 Yjs 更新碎片，减少数据库体积：

```bash
# 手动运行
pnpm --filter @notes/sync-server compress

# 定时任务（每小时）
0 * * * * cd /path/to/notes && pnpm --filter @notes/sync-server compress >> /var/log/notes-compress.log 2>&1
```

Docker Compose 部署时，可通过 `exec` 运行：

```bash
docker compose -f docker-compose.prod.yml exec server \
  node -e "import('./dist/scripts/compress-yjs.js').then(m => m.compressAllDocs()).then(c => console.log('Compressed', c, 'docs'))"
```

## 安全建议

1. **强密钥**：`JWT_SECRET` 和 `JWT_REFRESH_SECRET` 使用 `openssl rand -base64 32` 生成
2. **数据库密码**：不要使用默认密码，生产环境修改 `POSTGRES_PASSWORD`
3. **HTTPS**：必须配置 TLS，禁止明文传输 token
4. **防火墙**：仅开放 443 端口，PostgreSQL 5432 不对外暴露
5. **CORS**：当前配置 `origin: true`（允许所有来源），生产环境建议限制为具体域名
6. **Rate Limiting**：建议添加 `@fastify/rate-limit` 防止暴力破解

## 监控

健康检查端点：

```bash
curl http://localhost:3001/health
# {"status":"ok"}
```

建议配合 Uptime Kuma、Prometheus 等工具监控服务状态。
