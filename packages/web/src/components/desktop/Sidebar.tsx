import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNotesStore, useTagsStore, useUIStore } from "../../stores";
import { useSearch, useStorage } from "../../hooks";
import FolderTreeDropdown from "./FolderTreeDropdown";
import SearchBar from "../shared/SearchBar";
import ThemeToggle from "../shared/ThemeToggle";
import NoteCard from "../shared/NoteCard";
import DeleteTagDialog from "../shared/DeleteTagDialog";
import type { Note } from "@notes/core";

export default function Sidebar() {
  const notes = useNotesStore((s) => s.notes);
  const setCurrentNote = useNotesStore((s) => s.setCurrentNote);
  const tags = useTagsStore((s) => s.tags);
  const deleteTagFromStore = useTagsStore((s) => s.deleteTag);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const { getNotesForTag, deleteTag, createNote } = useStorage();
  const addNote = useNotesStore((s) => s.addNote);

  const { searchInput, updateFilter, clearSearch } = useSearch();
  const [showFilter, setShowFilter] = useState(false);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [affectedNotes, setAffectedNotes] = useState<Note[]>([]);

  const parentRef = useRef<HTMLDivElement>(null);

  const activeNotes = useMemo(() => notes.filter((n) => n.deletedAt === null), [notes]);

  const [tagFilteredNoteIds, setTagFilteredNoteIds] = useState<string[]>([]);

  useEffect(() => {
    if (activeTagIds.length === 0) {
      setTagFilteredNoteIds(activeNotes.map((n) => n.id));
      return;
    }
    let cancelled = false;
    (async () => {
      const idSets: Set<string>[] = [];
      for (const tagId of activeTagIds) {
        const tagNotes = await getNotesForTag(tagId);
        idSets.push(new Set(tagNotes.map((n) => n.id)));
      }
      if (cancelled) return;
      const intersection = idSets.reduce(
        (acc, set) => new Set([...acc].filter((id) => set.has(id))),
        idSets[0],
      );
      setTagFilteredNoteIds([...intersection]);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTagIds, activeNotes, getNotesForTag]);

  const finalNotes = useMemo(() => {
    if (activeTagIds.length === 0) return activeNotes;
    return activeNotes.filter((n) => tagFilteredNoteIds.includes(n.id));
  }, [activeNotes, activeTagIds, tagFilteredNoteIds]);

  const virtualizer = useVirtualizer({
    count: finalNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  const handleTagClick = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleNewNote = useCallback(async () => {
    const note = await createNote({ title: "" });
    addNote(note);
    setCurrentNote(note);
  }, [createNote, addNote, setCurrentNote]);

  const handleDeleteTagClick = useCallback(
    async (tagId: string) => {
      const tagNotes = await getNotesForTag(tagId);
      setAffectedNotes(tagNotes);
      setDeleteTagId(tagId);
    },
    [getNotesForTag],
  );

  const handleConfirmDeleteTag = useCallback(async () => {
    if (!deleteTagId) return;
    await deleteTag(deleteTagId);
    deleteTagFromStore(deleteTagId);
    setActiveTagIds((prev) => prev.filter((id) => id !== deleteTagId));
    setDeleteTagId(null);
    setAffectedNotes([]);
  }, [deleteTagId, deleteTag, deleteTagFromStore]);

  const deletingTagName = deleteTagId ? (tags.find((t) => t.id === deleteTagId)?.name ?? "") : "";

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
        <div className="flex items-center gap-2">
          <FolderTreeDropdown />
          <button
            onClick={handleNewNote}
            className="px-2 py-1 rounded-md text-sm hover:opacity-80"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          >
            + 新建
          </button>
        </div>
        <SearchBar
          query={searchInput.query || ""}
          onQueryChange={(q) => updateFilter({ query: q })}
          showFilter={showFilter}
          onToggleFilter={() => setShowFilter(!showFilter)}
        />
      </div>

      <div className="px-3 py-2 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-0.5">
            <button
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
            <button
              onClick={() => handleDeleteTagClick(tag.id)}
              className="px-1 py-0.5 text-xs rounded hover:opacity-80"
              style={{ color: "var(--text-secondary)" }}
              aria-label={`删除标签 ${tag.name}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto px-2">
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const note = finalNotes[virtualItem.index];
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

      <DeleteTagDialog
        open={deleteTagId !== null}
        onClose={() => {
          setDeleteTagId(null);
          setAffectedNotes([]);
        }}
        tagName={deletingTagName}
        affectedNotes={affectedNotes}
        onConfirm={handleConfirmDeleteTag}
      />
    </div>
  );
}
