import { useRef, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNotesStore, useTagsStore, useUIStore } from "../../stores";
import { useSearch } from "../../hooks";
import FolderTreeDropdown from "./FolderTreeDropdown";
import SearchBar from "../shared/SearchBar";
import ThemeToggle from "../shared/ThemeToggle";
import NoteCard from "../shared/NoteCard";

export default function Sidebar() {
  const notes = useNotesStore((s) => s.notes);
  const setCurrentNote = useNotesStore((s) => s.setCurrentNote);
  const tags = useTagsStore((s) => s.tags);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const { searchInput, updateFilter, clearSearch } = useSearch();
  const [showFilter, setShowFilter] = useState(false);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);

  const parentRef = useRef<HTMLDivElement>(null);

  const activeNotes = useMemo(() => notes.filter((n) => n.deletedAt === null), [notes]);

  const filteredNotes = useMemo(() => {
    if (activeTagIds.length === 0) return activeNotes;
    return activeNotes.filter((n) => activeTagIds.some((tagId) => n.id.includes(tagId) || true));
  }, [activeNotes, activeTagIds]);

  const virtualizer = useVirtualizer({
    count: filteredNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  const handleTagClick = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const sidebarWidth = sidebarOpen ? "320px" : "0px";

  return (
    <div
      data-testid="sidebar"
      className="h-full flex flex-col overflow-hidden border-r transition-all duration-300"
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="p-3 space-y-2 border-b" style={{ borderColor: "var(--border-color)" }}>
        <FolderTreeDropdown />
        <SearchBar
          query={searchInput.query || ""}
          onQueryChange={(q) => updateFilter({ query: q })}
          showFilter={showFilter}
          onToggleFilter={() => setShowFilter(!showFilter)}
        />
      </div>

      <div className="px-3 py-2 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => handleTagClick(tag.id)}
            className={`px-2 py-1 rounded-md text-xs ${
              activeTagIds.includes(tag.id) ? "bg-blue-500 text-white" : ""
            }`}
            style={
              !activeTagIds.includes(tag.id)
                ? { backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }
                : undefined
            }
          >
            {tag.name}
          </button>
        ))}
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto px-2">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const note = filteredNotes[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <NoteCard note={note} onClick={setCurrentNote} />
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="flex items-center justify-between p-3 border-t"
        style={{ borderColor: "var(--border-color)" }}
      >
        <ThemeToggle />
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="收起侧栏"
          className="px-2 py-1 rounded text-sm hover:opacity-80"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
        >
          收起 ←
        </button>
      </div>
    </div>
  );
}
