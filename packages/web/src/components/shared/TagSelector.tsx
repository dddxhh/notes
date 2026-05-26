import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useTagsStore } from "../../stores/tagsStore";

interface TagSelectorProps {
  selectedTagIds: string[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreateTag: (name: string) => void;
}

export default function TagSelector({
  selectedTagIds,
  onAdd,
  onRemove,
  onCreateTag,
}: TagSelectorProps) {
  const tags = useTagsStore((s) => s.tags);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const searchTrimmed = search.trim();
  const lowerSearch = searchTrimmed.toLowerCase();
  const filteredTags = tags.filter((t) => t.name.toLowerCase().includes(lowerSearch));
  const exactMatch = tags.some((t) => t.name.toLowerCase() === lowerSearch && searchTrimmed !== "");
  const canCreate = searchTrimmed !== "" && !exactMatch;

  const handleClick = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onRemove(tagId);
    } else {
      onAdd(tagId);
    }
  };

  const handleCreate = () => {
    onCreateTag(searchTrimmed);
    setSearch("");
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="px-2 py-0.5 text-xs rounded-full"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          添加标签
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-56 rounded-lg p-2 shadow-md"
          style={{
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
          sideOffset={4}
          align="start"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) handleCreate();
            }}
            placeholder="搜索或创建标签..."
            className="w-full rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              borderColor: "var(--border-color)",
            }}
            autoFocus
          />
          <div className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                onClick={() => handleClick(tag.id)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md cursor-pointer hover:opacity-80 ${
                  selectedTagIds.includes(tag.id) ? "bg-blue-500 text-white" : ""
                }`}
                style={
                  !selectedTagIds.includes(tag.id)
                    ? { backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }
                    : undefined
                }
              >
                {selectedTagIds.includes(tag.id) && <span>✓</span>}
                <span>{tag.name}</span>
              </div>
            ))}
            {canCreate && (
              <div
                onClick={handleCreate}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-md cursor-pointer hover:opacity-80 text-blue-500"
                style={{ backgroundColor: "var(--bg-tertiary)" }}
              >
                <span>+</span>
                <span>创建 '{searchTrimmed}'</span>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
