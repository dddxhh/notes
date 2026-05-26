import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  noteCount: number;
  onConfirm: (deleteNotes: boolean) => void;
}

export default function DeleteFolderDialog({
  open,
  onOpenChange,
  folderName,
  noteCount,
  onConfirm,
}: DeleteFolderDialogProps) {
  const [deleteNotes, setDeleteNotes] = useState(false);

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-6 shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <AlertDialog.Title className="text-lg font-bold mb-2">
            删除文件夹"{folderName}"
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm mb-3">
            该文件夹下有 {noteCount} 条笔记。删除后，笔记将回到"全部笔记"。
          </AlertDialog.Description>
          <label className="flex items-center gap-2 mb-4 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={deleteNotes}
              onChange={(e) => setDeleteNotes(e.target.checked)}
              className="rounded"
            />
            同时删除文件夹内的所有笔记
          </label>
          {deleteNotes && (
            <p className="text-xs mb-3" style={{ color: "var(--danger)" }}>
              笔记将被移到回收站，可在回收站中恢复。
            </p>
          )}
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
                onClick={() => {
                  onConfirm(deleteNotes);
                  setDeleteNotes(false);
                }}
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
