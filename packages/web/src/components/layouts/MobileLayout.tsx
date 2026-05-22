import { useState } from "react";
import { useNotesStore } from "../../stores";
import NoteView from "../NoteView";
import NoteListMobile from "../mobile/NoteListMobile";
import QuickNote from "../QuickNote";

export default function MobileLayout() {
  const currentNote = useNotesStore((s) => s.currentNote);
  const setCurrentNote = useNotesStore((s) => s.setCurrentNote);
  const [showList, setShowList] = useState(false);

  const handleBack = () => {
    setCurrentNote(null);
  };

  return (
    <div className="flex flex-col h-screen">
      {currentNote ? (
        <NoteView note={currentNote} onBack={handleBack} />
      ) : showList ? (
        <NoteListMobile />
      ) : (
        <QuickNote />
      )}

      <div className="flex justify-around py-2 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => { setCurrentNote(null); setShowList(false); }}
          className="text-xs text-blue-500 font-semibold"
        >
          📝 快速笔记
        </button>
        <button
          onClick={() => { setCurrentNote(null); setShowList(true); }}
          className="text-xs text-gray-600"
        >
          📋 全部笔记
        </button>
        <button className="text-xs text-gray-600">🔍 搜索</button>
        <button className="text-xs text-gray-600">⚙️</button>
      </div>
    </div>
  );
}