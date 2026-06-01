import Sidebar from "../desktop/Sidebar";
import NoteView from "../NoteView";
import QuickNote from "../QuickNote";
import TrashView from "../shared/TrashView";
import { useNotesStore, useUIStore } from "../../stores";

export default function DesktopLayout() {
  const currentNote = useNotesStore((s) => s.currentNote);
  const sharedNotePermissions = useNotesStore((s) => s.sharedNotePermissions);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const showTrash = useUIStore((s) => s.showTrash);

  const isReadOnly = currentNote ? sharedNotePermissions.get(currentNote.id) === "read" : false;

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      {sidebarOpen && <Sidebar />}

      <div data-testid="main-area" className="flex-1 h-full flex flex-col overflow-hidden">
        <div
          className="flex items-center p-2 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="展开侧栏"
            className="p-2 rounded-md hover:opacity-80"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          >
            {sidebarOpen ? "☰" : "☰"}
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {showTrash ? (
            <TrashView />
          ) : currentNote ? (
            <NoteView key={currentNote.id} note={currentNote} readOnly={isReadOnly} />
          ) : (
            <QuickNote />
          )}
        </div>
      </div>
    </div>
  );
}
