import { useRef, useMemo, useState, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useNotesStore, useTagsStore, useUIStore, useFoldersStore } from "../../stores";
import { useSearch, useStorage } from "../../hooks";
import FolderTreeDropdown from "./FolderTreeDropdown";
import SearchBar from "../shared/SearchBar";
import SearchFilterPanel from "../shared/SearchFilterPanel";
import ThemeToggle from "../shared/ThemeToggle";
import NoteCard from "../shared/NoteCard";
import DeleteTagDialog from "../shared/DeleteTagDialog";
import DeleteNoteDialog from "../shared/DeleteNoteDialog";
import MoveNoteDialog from "../shared/MoveNoteDialog";
import { extractTitleFromContent } from "../../lib/markdown-serializer";
import type { Note } from "@notes/core";

export default function Sidebar() {
  const notes = useNotesStore((s) => s.notes);
  const setCurrentNote = useNotesStore((s) => s.setCurrentNote);
  const tags = useTagsStore((s) => s.tags);
  const currentFolderId = useFoldersStore((s) => s.currentFolderId);
  const deleteTagFromStore = useTagsStore((s) => s.deleteTag);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const {
    getNotesForTag,
    listNotes,
    listFolders,
    listTags,
    deleteTag,
    createNote,
    deleteNote,
    updateNote,
    updateTag,
    getTagsForNote,
  } = useStorage();
  const addNote = useNotesStore((s) => s.addNote);
  const setNotes = useNotesStore((s) => s.setNotes);
  const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
  const noteTagsMap = useNotesStore((s) => s.noteTagsMap);
  const setNoteTagsMap = useNotesStore((s) => s.setNoteTagsMap);
  const setFolders = useFoldersStore((s) => s.setFolders);
  const setTags = useTagsStore((s) => s.setTags);
  const updateTagInList = useTagsStore((s) => s.updateTagInList);

  const { searchInput, result, updateFilter, clearSearch } = useSearch();
  const [showFilter, setShowFilter] = useState(false);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [affectedNotes, setAffectedNotes] = useState<Note[]>([]);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [moveNoteId, setMoveNoteId] = useState<string | null>(null);
  const [moveNoteFolderId, setMoveNoteFolderId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listNotes()
      .then((n) => setNotes(n))
      .catch(() => {});
    listFolders()
      .then((f) => setFolders(f))
      .catch(() => {});
    listTags()
      .then((t) => setTags(t))
      .catch(() => {});
  }, []);

  const activeNotes = useMemo(() => notes.filter((n) => n.deletedAt === null), [notes]);

  const [tagFilteredNoteIds, setTagFilteredNoteIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = new Map<string, { id: string; name: string }[]>();
      for (const note of activeNotes) {
        const tags = await getTagsForNote(note.id);
        map.set(note.id, tags);
      }
      if (!cancelled) {
        setNoteTagsMap(map);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNotes.length, getTagsForNote, setNoteTagsMap]);

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

  const searchResultIds = useMemo(() => {
    if (!result) return null;
    return new Set(result.notes.map((n) => n.id));
  }, [result]);

  const finalNotes = useMemo(() => {
    let notes = activeNotes;
    if (currentFolderId) {
      notes = notes.filter((n) => n.folderId === currentFolderId);
    }
    if (activeTagIds.length > 0) {
      notes = notes.filter((n) => tagFilteredNoteIds.includes(n.id));
    }
    if (searchInput.query) {
      const q = searchInput.query.toLowerCase();
      notes = notes.filter(
        (n) => n.title.toLowerCase().includes(q) || n.mdText.toLowerCase().includes(q),
      );
    }
    if (searchResultIds) {
      notes = notes.filter((n) => searchResultIds.has(n.id));
    }
    return notes;
  }, [
    activeNotes,
    currentFolderId,
    activeTagIds,
    tagFilteredNoteIds,
    searchInput,
    searchResultIds,
  ]);

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

  const handleStartEditTag = useCallback((tag: { id: string; name: string }) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
  }, []);

  const handleFinishEditTag = useCallback(async () => {
    if (!editingTagId || !editingTagName.trim()) {
      setEditingTagId(null);
      return;
    }
    const updated = await updateTag(editingTagId, { name: editingTagName.trim() });
    updateTagInList(updated.id, updated);
    const map = useNotesStore.getState().noteTagsMap;
    const next = new Map(map);
    for (const [noteId, noteTags] of map.entries()) {
      next.set(
        noteId,
        noteTags.map((t) => (t.id === updated.id ? updated : t)),
      );
    }
    useNotesStore.getState().setNoteTagsMap(next);
    setEditingTagId(null);
  }, [editingTagId, editingTagName, updateTag, updateTagInList]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote({ title: "", folderId: currentFolderId });
    addNote(note);
    setCurrentNote(note);
  }, [createNote, addNote, setCurrentNote, currentFolderId]);

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
        <div className="flex items-center justify-between">
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
        {showFilter && (
          <SearchFilterPanel tags={tags} filter={searchInput} onFilterChange={updateFilter} />
        )}
      </div>

      <div className="px-3 py-2 flex flex-wrap gap-1">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-0.5">
            {editingTagId === tag.id ? (
              <input
                value={editingTagName}
                onChange={(e) => setEditingTagName(e.target.value)}
                onBlur={handleFinishEditTag}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFinishEditTag();
                  if (e.key === "Escape") setEditingTagId(null);
                }}
                className="px-1 py-0.5 rounded-md text-xs w-20"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--accent)",
                }}
                autoFocus
              />
            ) : (
              <button
                onClick={() => handleTagClick(tag.id)}
                onDoubleClick={() => handleStartEditTag(tag)}
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
            )}
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
                <NoteCard
                  note={note}
                  onClick={setCurrentNote}
                  tags={noteTagsMap.get(note.id)}
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
      <DeleteNoteDialog
        open={deleteNoteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteNoteId(null);
        }}
        noteTitle={
          deleteNoteId
            ? finalNotes.find((n) => n.id === deleteNoteId)?.title ||
              extractTitleFromContent(finalNotes.find((n) => n.id === deleteNoteId)?.mdText || "")
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
