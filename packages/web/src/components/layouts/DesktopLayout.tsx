import Sidebar from "../desktop/Sidebar";
import NoteView from "../NoteView";
import QuickNote from "../QuickNote";
import { useNotesStore } from "../../stores";

export default function DesktopLayout() {
  const currentNote = useNotesStore((s) => s.currentNote);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 h-full overflow-auto">
        {currentNote ? <NoteView note={currentNote} /> : <QuickNote />}
      </div>
    </div>
  );
}