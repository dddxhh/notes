# 分享功能与 Yjs 压缩实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现笔记分享功能的客户端 UI（ShareDialog、共享给我、公开分享页面）以及服务端 Yjs 更新压缩脚本。

**Architecture:** 服务端分享 API 已完整实现（创建/列表/删除/公开访问）。WebSocket 权限控制已实现（read-only 用户无法写入）。本次实施仅涉及客户端 UI 和服务端压缩脚本。公开分享页面通过 `window.location.pathname` 检测实现，无需引入路由库。

**Tech Stack:** React 18, Radix UI Dialog, Zustand, fetch API, Node.js script

**注意：** WebSocket 分享权限控制（#11）已在 `sync-handler.ts:128-143` 实现，无需额外工作。

---

## 文件结构

| 文件                                                     | 操作 | 职责                                        |
| -------------------------------------------------------- | ---- | ------------------------------------------- |
| `packages/web/src/lib/sync-client.ts`                    | 修改 | 添加分享相关 API 方法                       |
| `packages/web/src/components/shared/ShareDialog.tsx`     | 新建 | 分享管理对话框（创建/查看/删除分享）        |
| `packages/web/src/components/shared/ContextMenu.tsx`     | 修改 | 添加"分享"菜单项                            |
| `packages/web/src/components/shared/PublicShareView.tsx` | 新建 | 公开分享页面（只读渲染）                    |
| `packages/web/src/App.tsx`                               | 修改 | 检测 `/s/:token` 路径，渲染 PublicShareView |
| `packages/web/src/components/desktop/Sidebar.tsx`        | 修改 | 添加"共享给我"分区                          |
| `packages/web/src/components/mobile/NoteListMobile.tsx`  | 修改 | 添加"共享给我"分区                          |
| `packages/web/src/stores/notesStore.ts`                  | 修改 | 添加 `sharedNotes` 状态                     |
| `packages/sync-server/src/scripts/compress-yjs.ts`       | 新建 | Yjs 更新压缩脚本                            |
| `packages/sync-server/package.json`                      | 修改 | 添加 `compress` npm script                  |

---

### Task 1: SyncClient 添加分享 API

**Files:**

- Modify: `packages/web/src/lib/sync-client.ts`
- Test: `packages/web/tests/lib/sync-client.test.ts`

- [ ] **Step 1: 在 SyncClient 中添加分享相关类型和方法**

在 `packages/web/src/lib/sync-client.ts` 文件末尾（`deleteAttachment` 方法之后，类结束之前）添加：

```typescript
  async createShare(input: {
    noteId: string;
    type: "public_link" | "user_share";
    targetUsername?: string;
    permission?: "read" | "write";
    password?: string;
    expiresAt?: string;
  }): Promise<{
    id: string;
    noteId: string;
    type: string;
    permission: string;
    shareToken?: string;
    targetUsername?: string;
    expiresAt: string | null;
  }> {
    return this.request("/api/v1/shares", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async listShares(): Promise<
    Array<{
      id: string;
      noteId: string;
      noteTitle: string;
      type: string;
      permission: string;
      targetUsername: string | null;
      hasPassword: boolean;
      expiresAt: string | null;
      createdAt: string;
    }>
  > {
    return this.request("/api/v1/shares");
  }

  async deleteShare(id: string): Promise<void> {
    await this.request(`/api/v1/shares/${id}`, { method: "DELETE" });
  }
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @notes/web typecheck
```

预期：PASS

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/lib/sync-client.ts
git commit -m "feat: add share API methods to SyncClient"
```

---

### Task 2: ShareDialog 组件

**Files:**

- Create: `packages/web/src/components/shared/ShareDialog.tsx`
- Test: `packages/web/tests/shared/ShareDialog.test.tsx`

- [ ] **Step 1: 编写 ShareDialog 测试**

创建 `packages/web/tests/shared/ShareDialog.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShareDialog from "../../src/components/shared/ShareDialog";

vi.mock("../../src/stores", () => ({
  useAuthStore: {
    getState: () => ({ serverUrl: "http://localhost:3001", accessToken: "test-token" }),
  },
}));

vi.mock("../../src/lib/sync-client", () => ({
  SyncClient: vi.fn().mockImplementation(() => ({
    listShares: vi.fn().mockResolvedValue([]),
    createShare: vi.fn().mockResolvedValue({ id: "s1", shareToken: "tok123", type: "public_link" }),
    deleteShare: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("ShareDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    noteId: "note-1",
    noteTitle: "测试笔记",
  };

  beforeEach(() => vi.clearAllMocks());

  it("renders dialog title with note title", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText(/分享.*测试笔记/)).toBeInTheDocument();
  });

  it("shows public link and user share tabs", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("公开链接")).toBeInTheDocument();
    expect(screen.getByText("指定用户")).toBeInTheDocument();
  });

  it("creates public link on button click", async () => {
    render(<ShareDialog {...defaultProps} />);
    const btn = screen.getByText("生成公开链接");
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/tok123/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @notes/web test -- tests/shared/ShareDialog.test.tsx
```

预期：FAIL（模块找不到）

- [ ] **Step 3: 实现 ShareDialog 组件**

创建 `packages/web/src/components/shared/ShareDialog.tsx`：

```tsx
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { useState, useEffect, useCallback } from "react";
import { SyncClient } from "../../lib/sync-client";
import { useAuthStore } from "../../stores/authStore";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
}

interface ShareItem {
  id: string;
  noteId: string;
  noteTitle: string;
  type: string;
  permission: string;
  targetUsername: string | null;
  hasPassword: boolean;
  expiresAt: string | null;
  createdAt: string;
}

function getClient(): SyncClient {
  const { serverUrl, accessToken } = useAuthStore.getState();
  return new SyncClient({
    serverUrl: serverUrl!,
    getToken: () => useAuthStore.getState().accessToken,
    onTokenExpired: async () => {
      try {
        await useAuthStore.getState().refresh();
        return true;
      } catch {
        return false;
      }
    },
  });
}

export default function ShareDialog({ open, onOpenChange, noteId, noteTitle }: ShareDialogProps) {
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState("");
  const [permission, setPermission] = useState<"read" | "write">("read");
  const [error, setError] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const client = getClient();
      const all = await client.listShares();
      setShares(all.filter((s) => s.noteId === noteId));
    } catch {
      setError("加载分享列表失败");
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (open) {
      loadShares();
      setPublicLink(null);
      setError(null);
    }
  }, [open, loadShares]);

  const handleCreatePublicLink = async () => {
    setError(null);
    try {
      const client = getClient();
      const result = await client.createShare({ noteId, type: "public_link" });
      if (result.shareToken) {
        const serverUrl = useAuthStore.getState().serverUrl;
        setPublicLink(`${serverUrl}/api/v1/shares/public/${result.shareToken}`);
      }
      await loadShares();
    } catch {
      setError("创建公开链接失败");
    }
  };

  const handleShareWithUser = async () => {
    if (!targetUsername.trim()) return;
    setError(null);
    try {
      const client = getClient();
      await client.createShare({
        noteId,
        type: "user_share",
        targetUsername: targetUsername.trim(),
        permission,
      });
      setTargetUsername("");
      await loadShares();
    } catch (err) {
      setError(err instanceof Error ? err.message : "分享失败");
    }
  };

  const handleDeleteShare = async (id: string) => {
    try {
      const client = getClient();
      await client.deleteShare(id);
      await loadShares();
    } catch {
      setError("删除分享失败");
    }
  };

  const handleCopyLink = () => {
    if (publicLink) {
      navigator.clipboard.writeText(publicLink);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 max-h-[80vh] rounded-lg p-6 shadow-lg overflow-y-auto z-[61]"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">分享「{noteTitle}」</Dialog.Title>

          {error && (
            <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <Tabs.Root defaultValue="public">
            <Tabs.List
              className="flex gap-2 mb-4 border-b"
              style={{ borderColor: "var(--border-color)" }}
            >
              <Tabs.Trigger
                value="public"
                className="px-3 py-1.5 text-sm rounded-t data-[state=active]:border-b-2"
                style={{ borderColor: "var(--accent)", color: "var(--text-primary)" }}
              >
                公开链接
              </Tabs.Trigger>
              <Tabs.Trigger
                value="user"
                className="px-3 py-1.5 text-sm rounded-t data-[state=active]:border-b-2"
                style={{ borderColor: "var(--accent)", color: "var(--text-primary)" }}
              >
                指定用户
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="public">
              <button
                onClick={handleCreatePublicLink}
                className="w-full rounded-md px-3 py-2 text-sm font-medium text-white mb-3"
                style={{ backgroundColor: "var(--accent)" }}
              >
                生成公开链接
              </button>
              {publicLink && (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    readOnly
                    value={publicLink}
                    className="flex-1 px-2 py-1 text-xs rounded border truncate"
                    style={{
                      borderColor: "var(--border-color)",
                      backgroundColor: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                    }}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-2 py-1 text-xs rounded"
                    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                  >
                    复制
                  </button>
                </div>
              )}
            </Tabs.Content>

            <Tabs.Content value="user">
              <div className="flex items-center gap-2 mb-3">
                <input
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="用户名"
                  className="flex-1 px-2 py-1.5 text-sm rounded border"
                  style={{
                    borderColor: "var(--border-color)",
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                  }}
                />
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as "read" | "write")}
                  className="px-2 py-1.5 text-sm rounded border"
                  style={{
                    borderColor: "var(--border-color)",
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="read">只读</option>
                  <option value="write">可写</option>
                </select>
                <button
                  onClick={handleShareWithUser}
                  className="px-3 py-1.5 text-sm rounded font-medium text-white"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  分享
                </button>
              </div>
            </Tabs.Content>
          </Tabs.Root>

          {loading ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              加载中...
            </p>
          ) : shares.length > 0 ? (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--border-color)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                已有分享
              </p>
              <ul className="space-y-1">
                {shares.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between text-sm px-2 py-1 rounded"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    <span>
                      {s.type === "public_link"
                        ? "🔗 公开链接"
                        : `👤 ${s.targetUsername} (${s.permission === "write" ? "可写" : "只读"})`}
                    </span>
                    <button
                      onClick={() => handleDeleteShare(s.id)}
                      className="text-xs px-1 hover:opacity-80"
                      style={{ color: "var(--danger)" }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end mt-4">
            <Dialog.Close asChild>
              <button
                className="rounded-md px-3 py-1.5 hover:opacity-80"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                关闭
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 4: 运行测试**

```bash
pnpm --filter @notes/web test -- tests/shared/ShareDialog.test.tsx
```

预期：PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/shared/ShareDialog.tsx packages/web/tests/shared/ShareDialog.test.tsx
git commit -m "feat: add ShareDialog component for note sharing"
```

---

### Task 3: ContextMenu 集成 ShareDialog

**Files:**

- Modify: `packages/web/src/components/shared/ContextMenu.tsx`
- Modify: `packages/web/src/components/NoteView.tsx`

- [ ] **Step 1: 在 ContextMenu 中添加"分享"菜单项**

修改 `packages/web/src/components/shared/ContextMenu.tsx`：

1. 添加 import：`import ShareDialog from "./ShareDialog";`
2. 在 `ContextMenuProps` 接口中添加：`noteTitle?: string;`
3. 添加 state：`const [shareOpen, setShareOpen] = useState(false);`
4. 在"复制 Markdown"菜单项之后、"删除"菜单项之前添加分享菜单项：

```tsx
<RadixContextMenu.Item
  onClick={() => setShareOpen(true)}
  className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
>
  分享
</RadixContextMenu.Item>
```

5. 在组件末尾（`MoveNoteDialog` 之后）添加 ShareDialog：

```tsx
{
  itemType === "note" && (
    <ShareDialog
      open={shareOpen}
      onOpenChange={setShareOpen}
      noteId={itemId}
      noteTitle={noteTitle ?? ""}
    />
  );
}
```

- [ ] **Step 2: 在 NoteView 中传递 noteTitle 给 ContextMenu**

修改 `packages/web/src/components/NoteView.tsx`，找到 `<ContextMenu` 调用处，添加 `noteTitle={title}` prop。

- [ ] **Step 3: 运行 typecheck 和测试**

```bash
pnpm --filter @notes/web typecheck
pnpm --filter @notes/web test
```

预期：全部 PASS

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/shared/ContextMenu.tsx packages/web/src/components/NoteView.tsx
git commit -m "feat: integrate ShareDialog into note context menu"
```

---

### Task 4: "共享给我" 侧栏分区

**Files:**

- Modify: `packages/web/src/stores/notesStore.ts`
- Modify: `packages/web/src/components/desktop/Sidebar.tsx`
- Modify: `packages/web/src/components/mobile/NoteListMobile.tsx`

- [ ] **Step 1: 在 notesStore 中添加 sharedNotes 派生状态**

在 `packages/web/src/stores/notesStore.ts` 的 `NotesState` 接口和 store 中添加：

```typescript
// 接口中添加：
sharedNotes: Note[];
setSharedNotes: (notes: Note[]) => void;

// store 中添加：
sharedNotes: [],
setSharedNotes: (notes) => set({ sharedNotes: notes }),
```

- [ ] **Step 2: 在 pullAll 中收集共享笔记**

修改 `packages/web/src/lib/sync-metadata.ts`，在 `pullAll` 函数的 `// --- REFRESH STORES ---` 部分之前添加：

```typescript
// --- SHARED NOTES ---
const sharedNoteMetas = remote.notes.filter((n) => !n.isOwner);
const sharedNotes: Note[] = [];
for (const sn of sharedNoteMetas) {
  const local = await storage.getNote(sn.id);
  if (local) sharedNotes.push(local);
}
useNotesStore.getState().setSharedNotes(sharedNotes);
```

- [ ] **Step 3: 在 Sidebar 中渲染"共享给我"分区**

在 `packages/web/src/components/desktop/Sidebar.tsx` 的笔记列表区域，在现有笔记列表之后（当 `currentFolderId === null` 且非搜索模式时）添加：

```tsx
{
  sharedNotes.length > 0 && currentFolderId === null && !searchInput && (
    <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
      <p className="text-xs font-semibold px-2 mb-1" style={{ color: "var(--text-secondary)" }}>
        共享给我
      </p>
      {sharedNotes.map((note) => (
        <div
          key={note.id}
          onClick={() => setCurrentNote(note)}
          className="text-sm px-2 py-1 rounded cursor-pointer hover:opacity-80"
          style={{
            backgroundColor: currentNote?.id === note.id ? "rgba(59,130,246,0.1)" : "transparent",
            color: currentNote?.id === note.id ? "var(--accent)" : "var(--text-primary)",
          }}
        >
          {note.title || <em style={{ color: "var(--text-tertiary)" }}>未命名</em>}
        </div>
      ))}
    </div>
  );
}
```

需要在组件顶部添加：

```tsx
const sharedNotes = useNotesStore((s) => s.sharedNotes);
const currentNote = useNotesStore((s) => s.currentNote);
```

- [ ] **Step 4: 在 NoteListMobile 中同样添加"共享给我"分区**

类似 Sidebar 的逻辑，在移动端笔记列表底部添加。

- [ ] **Step 5: 运行 typecheck 和测试**

```bash
pnpm --filter @notes/web typecheck
pnpm --filter @notes/web test
```

预期：全部 PASS

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/stores/notesStore.ts packages/web/src/lib/sync-metadata.ts packages/web/src/components/desktop/Sidebar.tsx packages/web/src/components/mobile/NoteListMobile.tsx
git commit -m "feat: add 'shared with me' section in sidebar and mobile note list"
```

---

### Task 5: 公开分享页面

**Files:**

- Create: `packages/web/src/components/shared/PublicShareView.tsx`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/vite.config.ts`（添加 SPA fallback）

- [ ] **Step 1: 创建 PublicShareView 组件**

创建 `packages/web/src/components/shared/PublicShareView.tsx`：

```tsx
import { useState, useEffect } from "react";
import MarkdownIt from "markdown-it";

interface PublicShareViewProps {
  token: string;
  serverUrl: string;
}

const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

export default function PublicShareView({ token, serverUrl }: PublicShareViewProps) {
  const [title, setTitle] = useState("");
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`${serverUrl}/api/v1/shares/public/${token}`);
        if (password) url.searchParams.set("password", password);

        const res = await fetch(url.toString());

        if (res.status === 401) {
          const body = await res.json();
          if (body.needsPassword) {
            setNeedsPassword(true);
            setLoading(false);
            return;
          }
          throw new Error(body.error || "认证失败");
        }

        if (res.status === 410) {
          throw new Error("分享已过期");
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "加载失败");
        }

        const data = await res.json();
        setTitle(data.title || "未命名笔记");
        setHtml(md.render(data.mdText || ""));
        setNeedsPassword(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [token, serverUrl, password]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ color: "var(--text-secondary)" }}
      >
        加载中...
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div
          className="w-80 p-6 rounded-lg shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            需要密码
          </h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            className="w-full px-3 py-2 rounded border mb-3"
            style={{
              borderColor: "var(--border-color)",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setPassword(password);
            }}
          />
          {error && (
            <p className="text-sm mb-2" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        {title}
      </h1>
      <div
        className="prose prose-lg max-w-none"
        style={{ color: "var(--text-primary)" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p className="mt-8 text-xs" style={{ color: "var(--text-tertiary)" }}>
        此笔记通过公开链接分享
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 修改 App.tsx 检测 `/s/:token` 路径**

修改 `packages/web/src/App.tsx`，在 `export default function App()` 的开头添加路径检测：

```tsx
const shareMatch = window.location.pathname.match(/^\/s\/(.+)$/);
if (shareMatch) {
  const serverUrl = sessionStorage.getItem("sync-server-url") || "http://localhost:3001";
  return (
    <Tooltip.Provider delayDuration={300}>
      <PublicShareView token={shareMatch[1]} serverUrl={serverUrl} />
    </Tooltip.Provider>
  );
}
```

在文件顶部添加 import：

```tsx
import PublicShareView from "./components/shared/PublicShareView";
```

- [ ] **Step 3: 配置 Vite SPA fallback**

在 `packages/web/vite.config.ts` 中确保 `appType: "spa"` 已设置（Vite 默认就是 SPA 模式，所有路径都会 fallback 到 index.html）。如果已有配置，无需修改。

- [ ] **Step 4: 运行 typecheck 和测试**

```bash
pnpm --filter @notes/web typecheck
pnpm --filter @notes/web test
```

预期：全部 PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/shared/PublicShareView.tsx packages/web/src/App.tsx
git commit -m "feat: add public share page for /s/:token routes"
```

---

### Task 6: Yjs 更新压缩脚本

**Files:**

- Create: `packages/sync-server/src/scripts/compress-yjs.ts`
- Modify: `packages/sync-server/package.json`
- Test: `packages/sync-server/src/scripts/compress-yjs.test.ts`

- [ ] **Step 1: 编写压缩脚本测试**

创建 `packages/sync-server/src/scripts/compress-yjs.test.ts`：

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPool } from "../db/client";
import { compressAllDocs } from "./compress-yjs";

const TEST_USER = "test-compress-user";

describe("compress-yjs", () => {
  beforeAll(async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users (id, username, password_hash) VALUES ($1, $2, 'hash') ON CONFLICT DO NOTHING`,
      [TEST_USER, TEST_USER],
    );
    await pool.query(
      `INSERT INTO yjs_updates (user_id, doc_name, update, clock) VALUES ($1, 'note:test-compress', $2, 1)`,
      [TEST_USER, Buffer.from([0, 0])],
    );
    await pool.query(
      `INSERT INTO yjs_updates (user_id, doc_name, update, clock) VALUES ($1, 'note:test-compress', $2, 2)`,
      [TEST_USER, Buffer.from([0, 0])],
    );
  });

  afterAll(async () => {
    const pool = getPool();
    await pool.query(`DELETE FROM yjs_updates WHERE doc_name = 'note:test-compress'`);
    await pool.query(`DELETE FROM users WHERE id = $1`, [TEST_USER]);
  });

  it("compresses multiple updates into one", async () => {
    const pool = getPool();
    const before = await pool.query(
      `SELECT COUNT(*) FROM yjs_updates WHERE doc_name = 'note:test-compress'`,
    );
    expect(Number(before.rows[0].count)).toBeGreaterThanOrEqual(2);

    await compressAllDocs();

    const after = await pool.query(
      `SELECT COUNT(*) FROM yjs_updates WHERE doc_name = 'note:test-compress'`,
    );
    expect(Number(after.rows[0].count)).toBe(1);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm --filter @notes/sync-server test -- src/scripts/compress-yjs.test.ts
```

预期：FAIL（模块找不到）

- [ ] **Step 3: 实现压缩脚本**

创建 `packages/sync-server/src/scripts/compress-yjs.ts`：

```typescript
import * as Y from "yjs";
import { getPool, closePool } from "../db/client";

export async function compressAllDocs(): Promise<number> {
  const pool = getPool();
  const docs = await pool.query(
    `SELECT doc_name, COUNT(*) as cnt FROM yjs_updates GROUP BY doc_name HAVING COUNT(*) > 1`,
  );

  let compressed = 0;

  for (const row of docs.rows) {
    const docName = row.doc_name as string;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updates = await client.query(
        `SELECT user_id, update FROM yjs_updates WHERE doc_name = $1 ORDER BY clock ASC`,
        [docName],
      );

      const doc = new Y.Doc();
      for (const u of updates.rows) {
        Y.applyUpdate(doc, new Uint8Array(u.update));
      }

      const stateUpdate = Y.encodeStateAsUpdate(doc);
      const firstUserId = updates.rows[0].user_id;

      await client.query(`DELETE FROM yjs_updates WHERE doc_name = $1`, [docName]);
      await client.query(
        `INSERT INTO yjs_updates (user_id, doc_name, update, clock) VALUES ($1, $2, $3, 1)`,
        [firstUserId, docName, Buffer.from(stateUpdate)],
      );

      await client.query("COMMIT");
      compressed++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Failed to compress ${docName}:`, err);
    } finally {
      client.release();
    }
  }

  return compressed;
}

async function main(): Promise<void> {
  console.log("Starting Yjs compression...");
  const count = await compressAllDocs();
  console.log(`Compressed ${count} documents.`);
  await closePool();
}

const isMain = process.argv[1]?.endsWith("compress-yjs");
if (isMain) {
  main().catch((err) => {
    console.error("Compression failed:", err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: 运行测试**

```bash
pnpm --filter @notes/sync-server test -- src/scripts/compress-yjs.test.ts
```

预期：PASS

- [ ] **Step 5: 在 package.json 中添加 compress 脚本**

修改 `packages/sync-server/package.json`，在 `scripts` 中添加：

```json
"compress": "tsx --env-file=.env src/scripts/compress-yjs.ts"
```

- [ ] **Step 6: 运行完整测试**

```bash
pnpm --filter @notes/sync-server test
```

预期：全部 PASS

- [ ] **Step 7: Commit**

```bash
git add packages/sync-server/src/scripts/compress-yjs.ts packages/sync-server/src/scripts/compress-yjs.test.ts packages/sync-server/package.json
git commit -m "feat: add Yjs updates compression script

Compresses multiple Yjs update fragments per document into a single
state update. Run manually or via cron:
  pnpm --filter @notes/sync-server compress"
```

---

### Task 7: 全局验证

- [ ] **Step 1: 运行完整验证**

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

预期：全部 PASS

- [ ] **Step 2: 更新部署文档**

在 `docs/deployment.md` 中添加 Yjs 压缩的 cron 配置说明：

```markdown
## Yjs 更新压缩

定期压缩 Yjs 更新碎片，减少数据库体积：

\`\`\`bash

# 手动运行

pnpm --filter @notes/sync-server compress

# 定时任务（每小时）

0 \* \* \* \* cd /path/to/notes && pnpm --filter @notes/sync-server compress >> /var/log/notes-compress.log 2>&1
\`\`\`
```

- [ ] **Step 3: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: add Yjs compression cron setup to deployment guide"
```
