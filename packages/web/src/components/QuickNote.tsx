import { useState, useCallback, useEffect, useMemo } from "react";
import { useStorage } from "../hooks";
import { useNotesStore, useUIStore, useTagsStore, useFoldersStore } from "../stores";
import NoteCard from "./shared/NoteCard";
import TagBadge from "./shared/TagBadge";
import type { Note } from "@notes/core";
import SearchBar from "./shared/SearchBar";

export default function QuickNote() {
  const { createNote, updateNote, listNotes, listFolders, listTags, getNotesForTag } = useStorage();
  const { notes, setNotes, addNote, setCurrentNote } = useNotesStore();
  const isMobile = useUIStore((s) => s.isMobile);
  const tags = useTagsStore((s) => s.tags);
  const setTags = useTagsStore((s) => s.setTags);
  const setFolders = useFoldersStore((s) => s.setFolders);
  const [inputValue, setInputValue] = useState("");
  const [currentQuickNoteId, setCurrentQuickNoteId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagFilteredNoteIds, setTagFilteredNoteIds] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    if (!selectedTagId) {
      setTagFilteredNoteIds(new Set());
      return;
    }
    let cancelled = false;
    getNotesForTag(selectedTagId)
      .then((tagNotes) => {
        if (!cancelled) {
          setTagFilteredNoteIds(new Set(tagNotes.map((n: Note) => n.id)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedTagId, getNotesForTag]);

  useEffect(() => {
    if (!currentQuickNoteId || !inputValue.trim()) return;
    const timeout = setTimeout(async () => {
      await updateNote(currentQuickNoteId, { mdText: inputValue });
    }, 500);
    return () => clearTimeout(timeout);
  }, [inputValue, currentQuickNoteId, updateNote]);

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      if (!currentQuickNoteId && newValue.trim()) {
        const note = await createNote({ title: "", mdText: newValue });
        addNote(note);
        setCurrentQuickNoteId(note.id);
      }
    },
    [currentQuickNoteId, createNote, addNote],
  );

  const handleNoteClick = useCallback(
    (note: any) => {
      setCurrentNote(note);
    },
    [setCurrentNote],
  );

  const handleTagFilter = useCallback(
    (tagId: string) => {
      setSelectedTagId(selectedTagId === tagId ? null : tagId);
    },
    [selectedTagId],
  );

  const filteredNotes = useMemo(() => {
    const base = notes.filter((n) => n.deletedAt === null);
    if (!selectedTagId || tagFilteredNoteIds.size === 0) return base;
    return base.filter((n) => tagFilteredNoteIds.has(n.id));
  }, [notes, selectedTagId, tagFilteredNoteIds]);

  const recentNotes = filteredNotes.slice(0, 10);

  return (
    <div className="flex flex-col h-full p-4 max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          ⚡ 快速笔记
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          开始输入 — 自动保存
        </p>
      </div>

      <textarea
        value={inputValue}
        onChange={handleInputChange}
        className={`w-full p-4 rounded-xl resize-none focus:outline-none`}
        style={{
          backgroundColor: "var(--bg-tertiary)",
          border: `2px solid var(--border-color)`,
          minHeight: isMobile ? "120px" : "160px",
        }}
        placeholder="想写点什么？"
      />

      {showSearch && (
        <div className="mt-2">
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            showFilter={false}
            onToggleFilter={() => {}}
          />
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="px-2 py-1 text-xs rounded-md"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          data-testid="search-toggle"
        >
          🔍 搜索
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            最近笔记
          </h3>
          {tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto">
              {tags.map((tag) => (
                <TagBadge key={tag.id} name={tag.name} onClick={() => handleTagFilter(tag.id)} />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {recentNotes.map((note) => (
            <NoteCard key={note.id} note={note} onClick={handleNoteClick} tags={tags} />
          ))}
        </div>
      </div>
    </div>
  );
}
