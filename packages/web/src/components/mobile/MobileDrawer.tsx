import * as Dialog from "@radix-ui/react-dialog";
import FolderTree from "../desktop/FolderTree";
import { useTagsStore, useFoldersStore } from "../../stores";

interface MobileDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigate?: () => void;
}

export default function MobileDrawer({ open, onOpenChange, onNavigate }: MobileDrawerProps) {
  const tags = useTagsStore((s) => s.tags);
  const setCurrentFolderId = useFoldersStore((s) => s.setCurrentFolderId);

  const handleSelectFolder = (id: string | null) => {
    setCurrentFolderId(id);
    onNavigate?.();
    onOpenChange?.(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          aria-label="打开导航"
          className="p-2 rounded-md hover:opacity-80"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
        >
          ☰
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          className="fixed left-0 top-0 bottom-0 w-72 z-50 p-4 overflow-auto"
          style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">导航</Dialog.Title>
          <Dialog.Close asChild>
            <button
              aria-label="关闭"
              className="absolute top-3 right-3 p-2 rounded-md hover:opacity-80"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              ✕
            </button>
          </Dialog.Close>

          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              文件夹
            </h3>
            <FolderTree onSelectFolder={handleSelectFolder} selectedFolderId={null} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onNavigate?.()}
                  className="px-2 py-1 rounded-md text-xs"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
