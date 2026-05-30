import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { useState, useEffect, useCallback } from "react";
import { SyncClient, type CreateShareInput, type Share } from "../../lib/sync-client";
import { useAuthStore, useNotesStore } from "../../stores";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
}

export default function ShareDialog({ open, onOpenChange, noteId, noteTitle }: ShareDialogProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState("");
  const [permission, setPermission] = useState<"read" | "write">("read");
  const [copied, setCopied] = useState(false);

  const webOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const getClient = useCallback(() => {
    const { serverUrl, accessToken } = useAuthStore.getState();
    if (!serverUrl || !accessToken) return null;
    return new SyncClient({
      serverUrl,
      getToken: () => accessToken,
      onTokenExpired: async () => false,
    });
  }, []);

  const loadShares = useCallback(async () => {
    const client = getClient();
    if (!client) return;
    try {
      const list = await client.listShares();
      setShares(list.filter((s) => s.noteId === noteId));
    } catch {
      setError("加载分享列表失败");
    }
  }, [getClient, noteId]);

  useEffect(() => {
    if (open) {
      loadShares();
      setCreatedToken(null);
      setError(null);
    }
  }, [open, loadShares]);

  const handleCreatePublicLink = async () => {
    const client = getClient();
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const input: CreateShareInput = { noteId, type: "public_link" };
      const result = await client.createShare(input);
      if (result.shareToken) {
        setCreatedToken(result.shareToken);
      }
      await loadShares();
    } catch {
      setError("创建公开链接失败");
    } finally {
      setLoading(false);
    }
  };

  const handleUserShare = async () => {
    const client = getClient();
    if (!client || !targetUsername.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const input: CreateShareInput = {
        noteId,
        type: "user_share",
        targetUsername: targetUsername.trim(),
        permission,
      };
      await client.createShare(input);
      setTargetUsername("");
      await loadShares();
    } catch {
      setError("分享失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const client = getClient();
    if (!client) return;
    try {
      await client.deleteShare(id);
      setShares((prev) => prev.filter((s) => s.id !== id));
      const remaining = shares.filter((s) => s.id !== id);
      if (!remaining.some((s) => s.noteId === noteId)) {
        const { sharedNoteIds, setSharedNoteIds } = useNotesStore.getState();
        const next = new Set(sharedNoteIds);
        next.delete(noteId);
        setSharedNoteIds(next);
      }
    } catch {
      setError("删除分享失败");
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("复制失败");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-h-[80vh] rounded-lg p-6 shadow-lg z-[61] overflow-y-auto"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">分享"{noteTitle}"</Dialog.Title>

          {error && (
            <div
              className="text-sm rounded-md px-3 py-2 mb-3"
              style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--danger)" }}
            >
              {error}
            </div>
          )}

          <Tabs.Root defaultValue="public_link">
            <Tabs.List
              className="flex gap-1 mb-4 rounded-md p-1"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              <Tabs.Trigger
                value="public_link"
                className="flex-1 text-sm rounded-md px-3 py-1.5 data-[state=active]:bg-[var(--bg-secondary)] data-[state=active]:shadow-sm"
                style={{ color: "var(--text-primary)" }}
              >
                公开链接
              </Tabs.Trigger>
              <Tabs.Trigger
                value="user_share"
                className="flex-1 text-sm rounded-md px-3 py-1.5 data-[state=active]:bg-[var(--bg-secondary)] data-[state=active]:shadow-sm"
                style={{ color: "var(--text-primary)" }}
              >
                指定用户
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="public_link">
              {createdToken ? (
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="flex-1 text-sm rounded-md px-3 py-1.5 border truncate"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {webOrigin}/s/{createdToken}
                  </span>
                  <button
                    onClick={() => handleCopy(`${webOrigin}/s/${createdToken}`)}
                    className="text-sm rounded-md px-3 py-1.5 hover:opacity-80"
                    style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                  >
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
              ) : shares.some((s) => s.type === "public_link") ? (
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="flex-1 text-sm rounded-md px-3 py-1.5 border truncate"
                    style={{
                      backgroundColor: "var(--bg-tertiary)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {webOrigin}/s/{shares.find((s) => s.type === "public_link")!.id}
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `${webOrigin}/s/${shares.find((s) => s.type === "public_link")!.id}`,
                      )
                    }
                    className="text-sm rounded-md px-3 py-1.5 hover:opacity-80"
                    style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                  >
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleCreatePublicLink}
                  disabled={loading}
                  className="text-sm rounded-md px-4 py-2 mb-4 hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  {loading ? "生成中..." : "生成公开链接"}
                </button>
              )}
            </Tabs.Content>

            <Tabs.Content value="user_share">
              <div className="flex items-center gap-2 mb-4">
                <input
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="输入用户名"
                  className="flex-1 text-sm rounded-md px-3 py-1.5 border outline-none"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
                <select
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as "read" | "write")}
                  className="text-sm rounded-md px-2 py-1.5 border outline-none"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="read">只读</option>
                  <option value="write">可写</option>
                </select>
                <button
                  onClick={handleUserShare}
                  disabled={loading || !targetUsername.trim()}
                  className="text-sm rounded-md px-4 py-2 hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: "var(--accent)", color: "#fff" }}
                >
                  {loading ? "分享中..." : "分享"}
                </button>
              </div>
            </Tabs.Content>
          </Tabs.Root>

          {shares.length > 0 && (
            <div className="mt-2">
              <h4 className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                已有分享
              </h4>
              <ul className="space-y-2">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between text-sm rounded-md px-3 py-2"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    <span>
                      {share.type === "public_link" ? "公开链接" : share.targetUsername || "用户"}
                      <span className="ml-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {share.permission === "read" ? "只读" : "可写"}
                      </span>
                    </span>
                    <button
                      onClick={() => handleDelete(share.id)}
                      className="text-xs rounded-md px-2 py-1 hover:opacity-80"
                      style={{ color: "var(--danger)" }}
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
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
