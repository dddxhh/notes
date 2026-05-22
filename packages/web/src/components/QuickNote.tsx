import { useState, useCallback, useEffect } from "react";
import { useStorage } from "../hooks";
import { useNotesStore, useUIStore } from "../stores";
import { extractTitleFromContent } from "../lib/markdown-serializer";
import NoteCard from "./shared/NoteCard";

export default function QuickNote() {
  const { createNote, listNotes } = useStorage();
  const { notes, setNotes, addNote, setCurrentNote } = useNotesStore();
  const isMobile = useUIStore((s) => s.isMobile);
  const [inputValue, setInputValue] = useState("");
  const [currentQuickNoteId, setCurrentQuickNoteId] = useState<string | null>(null);

  useEffect(() => {
    listNotes().then(setNotes);
  }, []);

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
    [currentQuickNoteId, createNote, addNote]
  );

  const handleNoteClick = useCallback((note: any) => {
    setCurrentNote(note);
  }, [setCurrentNote]);

  const recentNotes = notes.filter((n) => n.deletedAt === null).slice(0, 10);

  return (
    <div className="flex flex-col h-full p-4 max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">⚡ 快速笔记</h1>
        <p className="text-sm text-gray-500">开始输入 — 自动保存</p>
      </div>

      <textarea
        value={inputValue}
        onChange={handleInputChange}
        className={`w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-blue-500 ${
          isMobile ? "min-h-[120px]" : "min-h-[160px]"
        }`}
        placeholder="想写点什么？"
      />

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">最近笔记</h3>
        <div className="space-y-2">
          {recentNotes.map((note) => (
            <NoteCard key={note.id} note={note} onClick={handleNoteClick} />
          ))}
        </div>
      </div>
    </div>
  );
}