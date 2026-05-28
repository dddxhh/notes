FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sync-server/package.json ./packages/sync-server/
RUN pnpm install --frozen-lockfile

COPY packages/sync-server/ ./packages/sync-server/
COPY tsconfig.base.json ./

WORKDIR /app/packages/sync-server
RUN pnpm build

EXPOSE 3001
CMD ["node", "dist/server.js"]
