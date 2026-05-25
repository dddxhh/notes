import { useEffect, useState, useCallback, useRef } from "react";
import { useStorage } from "../../hooks";
import { useNotesStore, useFoldersStore, useTagsStore } from "../../stores";
import NoteCard from "../shared/NoteCard";
import TagBadge from "../shared/TagBadge";
import { useVirtualizer } from "@tanstack/react-virtual";
import MobileDrawer from "./MobileDrawer";

export default function NoteListMobile() {
  const { listNotes, listFolders } = useStorage();
  const { notes, setNotes, setCurrentNote } = useNotesStore();
  const { folders, setFolders } = useFoldersStore();
  const tags = useTagsStore((s) => s.tags);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    listNotes()
      .then(setNotes)
      .catch(() => {});
    listFolders()
      .then(setFolders)
      .catch(() => {});
  }, []);

  const activeNotes = notes.filter((n) => n.deletedAt === null);

  const handleTagFilter = useCallback(
    (tagId: string) => {
      setSelectedTagId(selectedTagId === tagId ? null : tagId);
    },
    [selectedTagId],
  );

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: activeNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b" style={{ borderColor: "var(--border-color)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          ← 全部笔记
        </h2>
      </div>

      <div
        className="flex items-center gap-1 px-3 py-2 overflow-x-auto border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        {tags.map((tag) => (
          <TagBadge key={tag.id} name={tag.name} onClick={() => handleTagFilter(tag.id)} />
        ))}
      </div>

      <div className="flex items-center px-3 py-1">
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-sm px-2 py-1 rounded-md"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          📁 文件夹
        </button>
      </div>

      <MobileDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const note = activeNotes[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <NoteCard key={note.id} note={note} onClick={setCurrentNote} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
