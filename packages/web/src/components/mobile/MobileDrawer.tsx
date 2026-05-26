import * as Dialog from "@radix-ui/react-dialog";
import FolderTree from "../desktop/FolderTree";
import { useTagsStore, useFoldersStore } from "../../stores";
import { useStorage } from "../../hooks";
import DeleteTagDialog from "../shared/DeleteTagDialog";
import type { Note } from "@notes/core";
import { useState, useCallback } from "react";

interface MobileDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigate?: () => void;
  onTagSelect?: (tagId: string) => void;
}

export default function MobileDrawer({
  open,
  onOpenChange,
  onNavigate,
  onTagSelect,
}: MobileDrawerProps) {
  const tags = useTagsStore((s) => s.tags);
  const deleteTagFromStore = useTagsStore((s) => s.deleteTag);
  const setCurrentFolderId = useFoldersStore((s) => s.setCurrentFolderId);
  const { getNotesForTag, deleteTag } = useStorage();

  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);
  const [affectedNotes, setAffectedNotes] = useState<Note[]>([]);

  const handleSelectFolder = (id: string | null) => {
    setCurrentFolderId(id);
    onNavigate?.();
    onOpenChange?.(false);
  };

  const handleDeleteTagClick = useCallback(
    async (tagId: string) => {
      const tagNotes = await getNotesForTag(tagId);
      setAffectedNotes(tagNotes);
      setDeleteTagId(tagId);
    },
    [getNotesForTag],
  );

  const handleConfirmDeleteTag = useCallback(async () => {
    if (!deleteTagId) return;
    await deleteTag(deleteTagId);
    deleteTagFromStore(deleteTagId);
    setDeleteTagId(null);
    setAffectedNotes([]);
  }, [deleteTagId, deleteTag, deleteTagFromStore]);

  const deletingTagName = deleteTagId ? (tags.find((t) => t.id === deleteTagId)?.name ?? "") : "";

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
                <div key={tag.id} className="flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      onTagSelect?.(tag.id);
                      onNavigate?.();
                      onOpenChange?.(false);
                    }}
                    className="px-2 py-1 rounded-md text-xs"
                    style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
                  >
                    #{tag.name}
                  </button>
                  <button
                    onClick={() => handleDeleteTagClick(tag.id)}
                    className="px-1 text-xs rounded hover:opacity-80"
                    style={{ color: "var(--text-secondary)" }}
                    aria-label={`删除标签 ${tag.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <DeleteTagDialog
        open={deleteTagId !== null}
        onClose={() => {
          setDeleteTagId(null);
          setAffectedNotes([]);
        }}
        tagName={deletingTagName}
        affectedNotes={affectedNotes}
        onConfirm={handleConfirmDeleteTag}
      />
    </Dialog.Root>
  );
}
