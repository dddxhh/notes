import { useState, useCallback, useEffect } from "react";
import { useStorage } from "../hooks";
import { useNotesStore, useUIStore, useTagsStore } from "../stores";
import { extractTitleFromContent } from "../lib/markdown-serializer";
import NoteCard from "./shared/NoteCard";
import TagBadge from "./shared/TagBadge";
import SearchBar from "./shared/SearchBar";

export default function QuickNote() {
  const { createNote, updateNote, listNotes, listTags } = useStorage();
  const { notes, setNotes, addNote, setCurrentNote } = useNotesStore();
  const isMobile = useUIStore((s) => s.isMobile);
  const tags = useTagsStore((s) => s.tags);
  const setTags = useTagsStore((s) => s.setTags);
  const [inputValue, setInputValue] = useState("");
  const [currentQuickNoteId, setCurrentQuickNoteId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    listNotes().then(setNotes);
    listTags().then(setTags);
  }, []);

  useEffect(() => {
    if (!currentQuickNoteId || !inputValue.trim()) return;
    const timeout = setTimeout(async () => {
      const title = extractTitleFromContent(inputValue);
      await updateNote(currentQuickNoteId, { title, mdText: inputValue });
    }, 500);
    return () => clearTimeout(timeout);
  }, [inputValue, currentQuickNoteId, updateNote]);

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      if (!currentQuickNoteId && newValue.trim()) {
        const title = extractTitleFromContent(newValue);
        const note = await createNote({ title, mdText: newValue });
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

  const filteredNotes = selectedTagId
    ? notes.filter((n) => n.deletedAt === null)
    : notes.filter((n) => n.deletedAt === null);

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
            <NoteCard
              key={note.id}
              note={note}
              onClick={handleNoteClick}
              tags={tags.filter((t) => true)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
