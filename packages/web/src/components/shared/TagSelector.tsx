import { useState } from "react";
import { useTagsStore } from "../../stores/tagsStore";
import TagCreateDialog from "./TagCreateDialog";

interface TagSelectorProps {
  selectedTagIds: string[];
  onAdd: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  onCreateTag: (name: string) => void;
}

export default function TagSelector({ selectedTagIds, onAdd, onRemove, onCreateTag }: TagSelectorProps) {
  const tags = useTagsStore((s) => s.tags);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredTags = tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const handleClick = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onRemove(tagId);
    } else {
      onAdd(tagId);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索标签..."
        className="w-full rounded-md border px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
        style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
      />
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {filteredTags.map((tag) => (
          <div
            key={tag.id}
            onClick={() => handleClick(tag.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer hover:opacity-80 ${
              selectedTagIds.includes(tag.id) ? "bg-blue-500 text-white" : ""
            }`}
            style={!selectedTagIds.includes(tag.id) ? { backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" } : undefined}
          >
            {selectedTagIds.includes(tag.id) && <span className="text-sm">✓</span>}
            <span>{tag.name}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setDialogOpen(true)}
        className="mt-1 rounded-md px-3 py-1.5 text-sm font-medium text-blue-500 hover:opacity-80"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        新建标签
      </button>
      <TagCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={(name) => {
          onCreateTag(name);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}