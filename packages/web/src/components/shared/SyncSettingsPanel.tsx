import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useSyncStore } from "../../stores/syncStore";

export default function SyncSettingsPanel() {
  const user = useAuthStore((s) => s.user);
  const serverUrl = useAuthStore((s) => s.serverUrl);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const syncStatus = useSyncStore((s) => s.status);
  const initSync = useSyncStore((s) => s.initSync);
  const disconnectSync = useSyncStore((s) => s.disconnect);

  const [url, setUrl] = useState(serverUrl ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(url, username, password);
      } else {
        await register(url, username, password);
      }
      const token = useAuthStore.getState().accessToken;
      if (token) {
        initSync({
          serverUrl: url,
          token,
          attachmentStrategy: "full",
        });
      }
      setUsername("");
      setPassword("");
    } catch {}
  };

  const handleLogout = () => {
    disconnectSync();
    logout();
  };

  if (user) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">云同步</h3>
        <div
          className="p-3 rounded-md space-y-2"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-primary)" }}>
              {user.username}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor:
                  syncStatus === "connected" || syncStatus === "syncing"
                    ? "var(--success, #22c55e)"
                    : "var(--text-secondary)",
                color: "white",
              }}
            >
              {syncStatus === "connected"
                ? "已同步"
                : syncStatus === "syncing"
                  ? "同步中"
                  : syncStatus === "connecting"
                    ? "连接中"
                    : syncStatus === "error"
                      ? "错误"
                      : "未连接"}
            </span>
          </div>
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {serverUrl}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-md hover:opacity-80 w-full"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--danger, #ef4444)" }}
          >
            退出登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">云同步</h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="url"
          placeholder="服务端地址 (https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="w-full text-sm px-3 py-2 rounded-md border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        />
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full text-sm px-3 py-2 rounded-md border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full text-sm px-3 py-2 rounded-md border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
          }}
        />
        {error && (
          <div className="text-xs p-2 rounded" style={{ color: "var(--danger, #ef4444)" }}>
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 text-sm px-3 py-2 rounded-md hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)", color: "white" }}
          >
            {isLoading ? "..." : mode === "login" ? "登录" : "注册"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-sm px-3 py-2 rounded-md hover:opacity-80"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          >
            {mode === "login" ? "注册" : "登录"}
          </button>
        </div>
      </form>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        连接服务端后可在多设备间同步笔记。
      </p>
    </div>
  );
}
