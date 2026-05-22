import * as RadixContextMenu from "@radix-ui/react-context-menu";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import RenameDialog from "./RenameDialog";
import MoveNoteDialog from "./MoveNoteDialog";

interface ContextMenuProps {
  itemId: string;
  itemType: "note" | "folder";
  currentName: string;
  currentFolderId?: string | null;
  onDelete: (id: string) => void;
  onMoveToFolder: (id: string, targetFolderId: string) => void;
  onAddTag: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onCopyMarkdown: (id: string) => void;
  children: React.ReactNode;
}

export default function ContextMenu({
  itemId,
  itemType,
  currentName,
  currentFolderId,
  onDelete,
  onMoveToFolder,
  onAddTag,
  onRename,
  onCopyMarkdown,
  children,
}: ContextMenuProps) {
  const deleteLabel = itemType === "folder" ? "删除文件夹" : "删除笔记";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger>{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Content
        className="context-menu-content"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <RadixContextMenu.Item
          onClick={() => setRenameOpen(true)}
          className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
        >
          重命名
        </RadixContextMenu.Item>
        {itemType === "note" && (
          <RadixContextMenu.Item
            onClick={() => setMoveOpen(true)}
            className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          >
            移动到文件夹
          </RadixContextMenu.Item>
        )}
        {itemType === "note" && (
          <RadixContextMenu.Item
            onClick={() => onAddTag(itemId)}
            className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          >
            添加标签
          </RadixContextMenu.Item>
        )}
        {itemType === "note" && (
          <RadixContextMenu.Item
            onClick={() => onCopyMarkdown(itemId)}
            className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          >
            复制 Markdown
          </RadixContextMenu.Item>
        )}
        <RadixContextMenu.Item
          onClick={() => setConfirmOpen(true)}
          className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          style={{ color: "var(--danger)" }}
        >
          {deleteLabel}
        </RadixContextMenu.Item>
      </RadixContextMenu.Content>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={deleteLabel}
        description={itemType === "folder" ? "确定要删除这个文件夹吗？" : "确定要删除这条笔记吗？"}
        confirmLabel="删除"
        variant="danger"
        onConfirm={() => onDelete(itemId)}
      />
      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentName={currentName}
        onRename={(newName) => onRename(itemId, newName)}
      />
      {itemType === "note" && (
        <MoveNoteDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          noteId={itemId}
          currentFolderId={currentFolderId ?? null}
          onMove={(targetFolderId) => onMoveToFolder(itemId, targetFolderId)}
        />
      )}
    </RadixContextMenu.Root>
  );
}
