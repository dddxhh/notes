import { useState, useCallback } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useFoldersStore, useNotesStore } from "../../stores";
import { useStorage } from "../../hooks";
import FolderTree from "./FolderTree";
import DeleteFolderDialog from "../shared/DeleteFolderDialog";

export default function FolderTreeDropdown() {
  const currentFolderId = useFoldersStore((s) => s.currentFolderId);
  const folders = useFoldersStore((s) => s.folders);
  const setCurrentFolderId = useFoldersStore((s) => s.setCurrentFolderId);
  const addFolder = useFoldersStore((s) => s.addFolder);
  const removeFolder = useFoldersStore((s) => s.removeFolder);
  const notes = useNotesStore((s) => s.notes);
  const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
  const { createFolder, updateFolder, deleteFolder, updateNotesFolderId, softDeleteNotesByFolder } =
    useStorage();

  const [open, setOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameMode, setRenameMode] = useState(false);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const currentFolder = folders.find((f) => f.id === currentFolderId);
  const label = currentFolder ? currentFolder.name : "全部笔记";

  const handleSelectFolder = (id: string | null) => {
    setCurrentFolderId(id);
    setOpen(false);
  };

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    const folder = await createFolder({ name: newFolderName.trim(), parentId: currentFolderId });
    addFolder(folder);
    setNewFolderName("");
    setCreateMode(false);
  }, [newFolderName, currentFolderId, createFolder, addFolder]);

  const handleRenameFolder = useCallback(async () => {
    if (!currentFolderId || !renameFolderName.trim()) return;
    const updated = await updateFolder(currentFolderId, { name: renameFolderName.trim() });
    useFoldersStore.getState().updateFolderInList(currentFolderId, updated);
    setRenameFolderName("");
    setRenameMode(false);
  }, [currentFolderId, renameFolderName, updateFolder]);

  const handleConfirmDeleteFolder = useCallback(
    async (deleteNotes: boolean) => {
      if (!deleteFolderId) return;
      if (deleteNotes) {
        await softDeleteNotesByFolder(deleteFolderId);
        const folderNotes = notes.filter(
          (n) => n.folderId === deleteFolderId && n.deletedAt === null,
        );
        for (const note of folderNotes) {
          removeNoteFromList(note.id);
        }
      } else {
        await updateNotesFolderId(deleteFolderId, null);
        const store = useNotesStore.getState();
        const folderNotes = store.notes.filter((n) => n.folderId === deleteFolderId);
        for (const note of folderNotes) {
          store.updateNoteInList(note.id, { id: note.id, folderId: null });
        }
      }
      await deleteFolder(deleteFolderId);
      removeFolder(deleteFolderId);
      if (currentFolderId === deleteFolderId) {
        setCurrentFolderId(null);
      }
      setDeleteFolderId(null);
    },
    [
      deleteFolderId,
      softDeleteNotesByFolder,
      updateNotesFolderId,
      deleteFolder,
      removeFolder,
      removeNoteFromList,
      notes,
      currentFolderId,
    ],
  );

  const deleteNoteCount = deleteFolderId
    ? notes.filter((n) => n.folderId === deleteFolderId && n.deletedAt === null).length
    : 0;

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            {label}
            <span className="text-xs ml-1">▼</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-50 rounded-md p-2 shadow-lg w-64"
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
            align="start"
            sideOffset={4}
          >
            <FolderTree onSelectFolder={handleSelectFolder} selectedFolderId={currentFolderId} />

            <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-color)" }}>
              {createMode ? (
                <div className="flex items-center gap-1">
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="文件夹名称"
                    className="flex-1 px-2 py-1 text-sm rounded border"
                    style={{
                      borderColor: "var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--text-primary)",
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                    }}
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="text-sm px-2 py-1 rounded"
                    style={{ backgroundColor: "var(--accent)", color: "white" }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setCreateMode(false);
                      setNewFolderName("");
                    }}
                    className="text-sm px-2 py-1 rounded"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreateMode(true)}
                  className="text-sm px-2 py-1 rounded hover:opacity-80 w-full text-left"
                  style={{ color: "var(--text-secondary)" }}
                >
                  + 新建文件夹
                </button>
              )}
            </div>

            {currentFolderId && !createMode && (
              <div className="mt-1 pt-1 border-t" style={{ borderColor: "var(--border-color)" }}>
                {renameMode ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={renameFolderName}
                      onChange={(e) => setRenameFolderName(e.target.value)}
                      placeholder={currentFolder?.name ?? ""}
                      className="flex-1 px-2 py-1 text-sm rounded border"
                      style={{
                        borderColor: "var(--border-color)",
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-primary)",
                      }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameFolder();
                      }}
                    />
                    <button
                      onClick={handleRenameFolder}
                      className="text-sm px-2 py-1 rounded"
                      style={{ backgroundColor: "var(--accent)", color: "white" }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setRenameMode(false);
                        setRenameFolderName("");
                      }}
                      className="text-sm px-2 py-1 rounded"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => {
                        setRenameMode(true);
                        setRenameFolderName(currentFolder?.name ?? "");
                      }}
                      className="text-sm px-2 py-1 rounded hover:opacity-80 w-full text-left"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      ✎ 重命名
                    </button>
                    <button
                      onClick={() => setDeleteFolderId(currentFolderId)}
                      className="text-sm px-2 py-1 rounded hover:opacity-80 w-full text-left"
                      style={{ color: "var(--danger)" }}
                    >
                      🗑 删除文件夹
                    </button>
                  </div>
                )}
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <DeleteFolderDialog
        open={deleteFolderId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteFolderId(null);
        }}
        folderName={
          deleteFolderId ? (folders.find((f) => f.id === deleteFolderId)?.name ?? "") : ""
        }
        noteCount={deleteNoteCount}
        onConfirm={handleConfirmDeleteFolder}
      />
    </>
  );
}
