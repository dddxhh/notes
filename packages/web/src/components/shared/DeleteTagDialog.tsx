import * as Dialog from "@radix-ui/react-dialog";
import type { Note } from "@notes/core";

interface DeleteTagDialogProps {
  open: boolean;
  onClose: () => void;
  tagName: string;
  affectedNotes: Note[];
  onConfirm: () => void;
}

export default function DeleteTagDialog({
  open,
  onClose,
  tagName,
  affectedNotes,
  onConfirm,
}: DeleteTagDialogProps) {
  const MAX_DISPLAY = 10;
  const displayedNotes = affectedNotes.slice(0, MAX_DISPLAY);
  const remaining = affectedNotes.length - MAX_DISPLAY;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-6 shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">删除标签 '{tagName}'</Dialog.Title>
          {affectedNotes.length > 0 && (
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                以下笔记将失去此标签：
              </p>
              <ul className="text-sm space-y-1">
                {displayedNotes.map((note) => (
                  <li key={note.id} className="truncate">
                    {note.title}
                  </li>
                ))}
                {remaining > 0 && (
                  <li style={{ color: "var(--text-secondary)" }}>...等 {remaining} 个笔记</li>
                )}
              </ul>
            </div>
          )}
          {affectedNotes.length === 0 && (
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              没有笔记使用此标签。
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                className="rounded-md px-3 py-1.5 hover:opacity-80"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                取消
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              className="rounded-md px-3 py-1.5 font-medium text-white bg-red-500 hover:bg-red-600"
            >
              确认删除
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
