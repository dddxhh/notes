import { useEffect } from "react";
import { useStorage } from "../../hooks";
import { useNotesStore } from "../../stores";
import NoteCard from "../shared/NoteCard";

export default function NoteListMobile() {
  const { listNotes } = useStorage();
  const { notes, setNotes, setCurrentNote } = useNotesStore();

  useEffect(() => {
    listNotes().then(setNotes);
  }, []);

  const activeNotes = notes.filter((n) => n.deletedAt === null);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">← 全部笔记</h2>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {activeNotes.map((note) => (
          <NoteCard key={note.id} note={note} onClick={setCurrentNote} />
        ))}
      </div>
    </div>
  );
}