import type { Folder, Tag, SearchInput, TagFilterMode } from "@notes/core";

interface SearchFilterPanelProps {
  folders: Folder[];
  tags: Tag[];
  filter: SearchInput;
  onFilterChange: (partial: Partial<SearchInput>) => void;
}

export default function SearchFilterPanel({
  folders,
  tags,
  filter,
  onFilterChange,
}: SearchFilterPanelProps) {
  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({ folderId: value || undefined });
  };

  const handleTagClick = (tagId: string) => {
    const current = filter.tagIds || [];
    const newTagIds = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    onFilterChange({ tagIds: newTagIds, tagMode: filter.tagMode || "union" });
  };

  const handleTagModeToggle = () => {
    const newMode: TagFilterMode = filter.tagMode === "intersection" ? "union" : "intersection";
    onFilterChange({ tagMode: newMode, tagIds: filter.tagIds });
  };

  const handleDateFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const field = e.target.value as "created_at" | "updated_at";
    onFilterChange({
      dateRange: {
        field,
        from: filter.dateRange?.from,
        to: filter.dateRange?.to,
      },
    });
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const from = e.target.value ? new Date(e.target.value).getTime() : undefined;
    onFilterChange({
      dateRange: {
        field: filter.dateRange?.field || "updated_at",
        from,
        to: filter.dateRange?.to,
      },
    });
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const to = e.target.value ? new Date(e.target.value).getTime() : undefined;
    onFilterChange({
      dateRange: {
        field: filter.dateRange?.field || "updated_at",
        from: filter.dateRange?.from,
        to,
      },
    });
  };

  return (
    <div
      className="flex flex-col gap-3 p-3 rounded-lg"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      <div>
        <label className="text-sm font-medium block mb-1" style={{ color: "var(--text-primary)" }}>
          文件夹
        </label>
        <select
          value={filter.folderId || ""}
          onChange={handleFolderChange}
          aria-label="文件夹"
          className="w-full rounded-md border px-2 py-1.5 text-sm outline-none"
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            borderColor: "var(--border-color)",
          }}
        >
          <option value="">全部</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            标签筛选
          </span>
          <button
            onClick={handleTagModeToggle}
            className="text-xs px-2 py-1 rounded-md hover:opacity-80"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          >
            {filter.tagMode === "intersection" ? "交集" : "并集"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              className={`px-2 py-1 rounded-md text-xs ${
                filter.tagIds?.includes(tag.id) ? "bg-blue-500 text-white" : ""
              }`}
              style={
                !filter.tagIds?.includes(tag.id)
                  ? { backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }
                  : undefined
              }
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium block mb-1" style={{ color: "var(--text-primary)" }}>
          时间范围
        </span>
        <select
          value={filter.dateRange?.field || "updated_at"}
          onChange={handleDateFieldChange}
          className="w-full rounded-md border px-2 py-1.5 text-sm outline-none mb-2"
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            borderColor: "var(--border-color)",
          }}
        >
          <option value="created_at">创建时间</option>
          <option value="updated_at">更新时间</option>
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            onChange={handleFromDateChange}
            aria-label="起始日期"
            className="flex-1 rounded-md border px-2 py-1.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              borderColor: "var(--border-color)",
            }}
          />
          <input
            type="date"
            onChange={handleToDateChange}
            aria-label="结束日期"
            className="flex-1 rounded-md border px-2 py-1.5 text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              borderColor: "var(--border-color)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
