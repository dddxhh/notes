import * as Dialog from "@radix-ui/react-dialog";
import { useFoldersStore } from "../../stores";
import { buildFolderTree, type FolderTreeNode } from "../../hooks/useFolderTree";

interface MoveNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  currentFolderId: string | null;
  onMove: (targetFolderId: string) => void;
}

function FolderItem({
  node,
  currentFolderId,
  onSelect,
}: {
  node: FolderTreeNode;
  currentFolderId: string | null;
  onSelect: (id: string) => void;
}) {
  const isCurrent = node.folder.id === currentFolderId;

  return (
    <li className={isCurrent ? "opacity-50 cursor-default" : "cursor-pointer"}>
      <span
        onClick={() => {
          if (!isCurrent) onSelect(node.folder.id);
        }}
        className="text-sm px-2 py-1 rounded hover:bg-[var(--hover-bg)] block"
      >
        {node.folder.name}
      </span>
      {node.children.length > 0 && (
        <ul className="ml-4 mt-1">
          {node.children.map((child) => (
            <FolderItem
              key={child.folder.id}
              node={child}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function MoveNoteDialog({
  open,
  onOpenChange,
  noteId,
  currentFolderId,
  onMove,
}: MoveNoteDialogProps) {
  const folders = useFoldersStore((s) => s.folders);
  const tree = buildFolderTree(folders);

  const handleSelect = (folderId: string) => {
    onMove(folderId);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 max-h-60 rounded-lg p-6 shadow-lg overflow-y-auto"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">移动到文件夹</Dialog.Title>
          <ul className="ml-2">
            {tree.map((node) => (
              <FolderItem
                key={node.folder.id}
                node={node}
                currentFolderId={currentFolderId}
                onSelect={handleSelect}
              />
            ))}
          </ul>
          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close asChild>
              <button
                className="rounded-md px-3 py-1.5 hover:opacity-80"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                取消
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
