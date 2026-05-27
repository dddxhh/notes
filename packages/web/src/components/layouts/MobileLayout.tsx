import { useState, useCallback } from "react";
import { useNotesStore, useFoldersStore, useUIStore } from "../../stores";
import { useStorage } from "../../hooks";
import NoteView from "../NoteView";
import NoteListMobile from "../mobile/NoteListMobile";
import QuickNote from "../QuickNote";
import MobileSearch from "../mobile/MobileSearch";
import MobileSettings from "../mobile/MobileSettings";
import MobileFAB from "../mobile/MobileFAB";
import MobileDrawer from "../mobile/MobileDrawer";
import TrashView from "../shared/TrashView";

type ScreenState = "quickNote" | "noteList" | "search" | "settings";

export default function MobileLayout() {
  const currentNote = useNotesStore((s) => s.currentNote);
  const setCurrentNote = useNotesStore((s) => s.setCurrentNote);
  const { createNote } = useStorage();
  const addNote = useNotesStore((s) => s.addNote);
  const [screen, setScreen] = useState<ScreenState>("quickNote");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showTrash = useUIStore((s) => s.showTrash);

  const handleBack = useCallback(() => {
    setCurrentNote(null);
  }, [setCurrentNote]);

  const currentFolderId = useFoldersStore((s) => s.currentFolderId);

  const handleNewNote = useCallback(async () => {
    const note = await createNote({ title: "", folderId: currentFolderId });
    setCurrentNote(note);
  }, [createNote, setCurrentNote, currentFolderId]);

  const handleSelectNoteFromSearch = useCallback(
    (id: string) => {
      setCurrentNote(null);
      setScreen("noteList");
    },
    [setCurrentNote],
  );

  const handleDrawerNavigate = useCallback(() => {
    setDrawerOpen(false);
    setScreen("noteList");
  }, []);

  const renderScreen = () => {
    if (showTrash) {
      return <TrashView />;
    }
    if (currentNote) {
      return <NoteView key={currentNote.id} note={currentNote} onBack={handleBack} />;
    }
    switch (screen) {
      case "quickNote":
        return <QuickNote />;
      case "noteList":
        return <NoteListMobile />;
      case "search":
        return <MobileSearch onSelectNote={handleSelectNoteFromSearch} />;
      case "settings":
        return <MobileSettings />;
    }
  };

  const tabs: { key: ScreenState; label: string; icon: string }[] = [
    { key: "quickNote", label: "快速笔记", icon: "📝" },
    { key: "noteList", label: "笔记", icon: "📋" },
    { key: "search", label: "搜索", icon: "🔍" },
    { key: "settings", label: "设置", icon: "⚙️" },
  ];

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div
        className="flex items-center p-2 border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <MobileDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onNavigate={handleDrawerNavigate}
        />
      </div>

      <div className="flex-1 overflow-auto">{renderScreen()}</div>

      <MobileFAB onNewNote={handleNewNote} />

      <div
        className="flex justify-around py-2 border-t"
        style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setCurrentNote(null);
              setScreen(tab.key);
            }}
            className={`text-xs ${
              screen === tab.key && !currentNote ? "text-[var(--accent)] font-semibold" : ""
            }`}
            style={
              screen !== tab.key || currentNote ? { color: "var(--text-secondary)" } : undefined
            }
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
