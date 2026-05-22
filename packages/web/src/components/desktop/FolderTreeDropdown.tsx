import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { useFoldersStore } from "../../stores";
import FolderTree from "./FolderTree";

export default function FolderTreeDropdown() {
  const currentFolderId = useFoldersStore((s) => s.currentFolderId);
  const folders = useFoldersStore((s) => s.folders);
  const setCurrentFolderId = useFoldersStore((s) => s.setCurrentFolderId);
  const [open, setOpen] = useState(false);

  const currentFolder = folders.find((f) => f.id === currentFolderId);
  const label = currentFolder ? currentFolder.name : "全部笔记";

  const handleSelectFolder = (id: string | null) => {
    setCurrentFolderId(id);
    setOpen(false);
  };

  return (
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}