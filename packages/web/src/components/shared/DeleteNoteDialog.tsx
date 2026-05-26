import * as AlertDialog from "@radix-ui/react-alert-dialog";

interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle: string;
  onConfirm: () => void;
}

export default function DeleteNoteDialog({
  open,
  onOpenChange,
  noteTitle,
  onConfirm,
}: DeleteNoteDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-6 shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <AlertDialog.Title className="text-lg font-bold mb-2">删除笔记</AlertDialog.Title>
          <AlertDialog.Description className="text-sm mb-4">
            确定要删除笔记"{noteTitle}"吗？删除后可在回收站中恢复。
          </AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                className="rounded-md px-3 py-1.5 hover:opacity-80"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                取消
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={onConfirm}
                className="rounded-md px-3 py-1.5 font-medium text-white bg-red-500 hover:bg-red-600"
              >
                删除
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
