import { useEffect } from "react";
import { useStorage } from "../../hooks";
import { useNotesStore, useFoldersStore } from "../../stores";
import NoteCard from "../shared/NoteCard";

export default function Sidebar() {
  const { listNotes, listFolders } = useStorage();
  const { notes, setNotes, setCurrentNote } = useNotesStore();
  const { folders, setFolders } = useFoldersStore();

  useEffect(() => {
    listNotes().then(setNotes);
    listFolders().then(setFolders);
  }, []);

  const activeNotes = notes.filter((n) => n.deletedAt === null);

  return (
    <div className="w-[320px] h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">全部笔记</h2>
          <span className="text-xs text-gray-500">▼ 文件夹</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {activeNotes.map((note) => (
          <NoteCard key={note.id} note={note} onClick={setCurrentNote} />
        ))}
      </div>
    </div>
  );
}