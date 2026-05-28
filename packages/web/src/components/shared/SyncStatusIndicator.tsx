import { useSyncStore } from "../../stores/syncStore";
import { useAuthStore } from "../../stores/authStore";

const statusConfig: Record<string, { icon: string; label: string; color: string }> = {
  disconnected: { icon: "○", label: "未连接", color: "var(--text-secondary)" },
  connecting: { icon: "◌", label: "连接中...", color: "var(--accent)" },
  connected: { icon: "●", label: "已同步", color: "var(--success, #22c55e)" },
  syncing: { icon: "◉", label: "同步中...", color: "var(--accent)" },
  error: { icon: "✕", label: "同步错误", color: "var(--danger, #ef4444)" },
};

export default function SyncStatusIndicator() {
  const status = useSyncStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const isSyncEnabled = useSyncStore((s) => s.engine !== null);

  if (!isSyncEnabled) return null;

  const config = statusConfig[status] ?? statusConfig.disconnected;

  return (
    <div
      className="flex items-center gap-1.5 text-xs"
      title={`${config.label}${user ? ` · ${user.username}` : ""}`}
      style={{ color: config.color }}
    >
      <span>{config.icon}</span>
      <span className="hidden md:inline">{config.label}</span>
    </div>
  );
}
