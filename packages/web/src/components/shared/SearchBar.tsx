interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  showFilter: boolean;
  onToggleFilter: () => void;
}

export default function SearchBar({
  query,
  onQueryChange,
  showFilter,
  onToggleFilter,
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-2" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <div
        className="flex items-center flex-1 rounded-md border px-2"
        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-primary)" }}
      >
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          🔍
        </span>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="搜索笔记..."
          className="w-full px-2 py-1.5 outline-none text-sm"
          style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            aria-label="清除搜索"
            className="text-sm hover:opacity-80"
            style={{ color: "var(--text-secondary)" }}
          >
            ✕
          </button>
        )}
      </div>
      <button
        onClick={onToggleFilter}
        aria-label="筛选切换"
        className="px-2 py-1.5 rounded-md text-sm hover:opacity-80"
        style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
      >
        {showFilter ? "▲筛选" : "▼筛选"}
      </button>
    </div>
  );
}
