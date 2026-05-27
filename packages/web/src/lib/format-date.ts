export function formatDateTime(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const dateStr = d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}

export function formatShortDateTime(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const dateStr = d.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
  const timeStr = d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}
