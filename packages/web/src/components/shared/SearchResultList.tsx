import type { SearchResult } from "@notes/core";
import { formatShortDateTime } from "../../lib/format-date";

interface SearchResultListProps {
  result: SearchResult | null;
  loading: boolean;
  onSelectNote: (id: string) => void;
  onLoadMore: () => void;
}

export default function SearchResultList({
  result,
  loading,
  onSelectNote,
  onLoadMore,
}: SearchResultListProps) {
  if (loading) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        搜索中...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        暂无结果
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {result.notes.map((note) => {
        const timeStr = formatShortDateTime(note.updatedAt);
        return (
          <button
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className="block w-full p-3 rounded-lg border text-left text-sm hover:opacity-80"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="font-semibold truncate">{note.title}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              {timeStr}
            </div>
          </button>
        );
      })}
      {result.hasMore && (
        <button
          onClick={onLoadMore}
          className="w-full py-2 text-center text-sm rounded-md hover:opacity-80"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
        >
          加载更多
        </button>
      )}
    </div>
  );
}
