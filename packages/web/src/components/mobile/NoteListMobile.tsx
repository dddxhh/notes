import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useStorage } from "../../hooks";
import { useNotesStore, useFoldersStore, useTagsStore } from "../../stores";
import NoteCard from "../shared/NoteCard";
import TagBadge from "../shared/TagBadge";
import DeleteNoteDialog from "../shared/DeleteNoteDialog";
import MoveNoteDialog from "../shared/MoveNoteDialog";
import { extractTitleFromContent } from "../../lib/markdown-serializer";
import { useVirtualizer } from "@tanstack/react-virtual";
import MobileDrawer from "./MobileDrawer";

export default function NoteListMobile() {
  const { listNotes, listFolders, getNotesForTag, createNote, deleteNote, updateNote } =
    useStorage();
  const { notes, setNotes, setCurrentNote } = useNotesStore();
  const addNote = useNotesStore((s) => s.addNote);
  const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
  const { folders, setFolders } = useFoldersStore();
  const tags = useTagsStore((s) => s.tags);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagFilteredNoteIds, setTagFilteredNoteIds] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
  const [moveNoteFolderId, setMoveNoteFolderId] = useState<string | null>(null);

  useEffect(() => {
    listNotes()
      .then(setNotes)
      .catch(() => {});
    listFolders()
      .then(setFolders)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedTagId) {
      setTagFilteredNoteIds(new Set());
      return;
    }
    let cancelled = false;
    getNotesForTag(selectedTagId)
      .then((tagNotes) => {
        if (!cancelled) {
          setTagFilteredNoteIds(new Set(tagNotes.map((n) => n.id)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedTagId, getNotesForTag]);

  const activeNotes = useMemo(() => {
    const base = notes.filter((n) => n.deletedAt === null);
    if (!selectedTagId || tagFilteredNoteIds.size === 0) return base;
    return base.filter((n) => tagFilteredNoteIds.has(n.id));
  }, [notes, selectedTagId, tagFilteredNoteIds]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote({ title: "" });
    addNote(note);
    setCurrentNote(note);
  }, [createNote, addNote, setCurrentNote]);

  const handleTagFilter = useCallback(
    (tagId: string) => {
      setSelectedTagId(selectedTagId === tagId ? null : tagId);
    },
    [selectedTagId],
  );

  const handleTagSelectFromDrawer = useCallback((tagId: string) => {
    setSelectedTagId(tagId);
  }, []);

  const handleDeleteNote = useCallback(async () => {
    if (!deleteNoteId) return;
    await deleteNote(deleteNoteId);
    removeNoteFromList(deleteNoteId);
    setDeleteNoteId(null);
  }, [deleteNoteId, deleteNote, removeNoteFromList]);

  const handleMoveToFolder = useCallback(
    async (targetFolderId: string) => {
      if (!moveNoteId) return;
      await updateNote(moveNoteId, { folderId: targetFolderId });
      useNotesStore
        .getState()
        .updateNoteInList(moveNoteId, { id: moveNoteId, folderId: targetFolderId });
      setMoveNoteId(null);
      setMoveNoteFolderId(null);
    },
    [moveNoteId, updateNote],
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
      <div
        className="p-3 border-b flex items-center justify-between"
        style={{ borderColor: "var(--border-color)" }}
      >
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          ← 全部笔记
        </h2>
        <button
          onClick={handleNewNote}
          className="px-3 py-1 rounded-md text-sm hover:opacity-80"
          style={{ backgroundColor: "var(--accent)", color: "white" }}
        >
          + 新建
        </button>
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

      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onTagSelect={handleTagSelectFromDrawer}
      />

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
                <NoteCard
                  key={note.id}
                  note={note}
                  onClick={setCurrentNote}
                  onDelete={(n) => setDeleteNoteId(n.id)}
                  onMoveToFolder={(n) => {
                    setMoveNoteId(n.id);
                    setMoveNoteFolderId(n.folderId);
                  }}
                  onCopyMarkdown={(n) => navigator.clipboard.writeText(n.mdText)}
                />
              </div>
            );
          })}
        </div>
      </div>
      <DeleteNoteDialog
        open={deleteNoteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteNoteId(null);
        }}
        noteTitle={
          deleteNoteId
            ? activeNotes.find((n) => n.id === deleteNoteId)?.title ||
              extractTitleFromContent(activeNotes.find((n) => n.id === deleteNoteId)?.mdText || "")
            : ""
        }
        onConfirm={handleDeleteNote}
      />
      <MoveNoteDialog
        open={moveNoteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMoveNoteId(null);
            setMoveNoteFolderId(null);
          }
        }}
        noteId={moveNoteId ?? ""}
        currentFolderId={moveNoteFolderId}
        onMove={handleMoveToFolder}
      />
    </div>
  );
}
