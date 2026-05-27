import { useEffect, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useNotesStore, useUIStore } from "../../stores";
import { formatDateTime } from "../../lib/format-date";
import { isExpired } from "@notes/core";

function getDaysRemaining(deletedAt: number | null, now: number): number | null {
  if (deletedAt === null) return null;
  const remaining = 30 - Math.floor((now - deletedAt) / (24 * 60 * 60 * 1000));
  return remaining > 0 ? remaining : 0;
}

export default function TrashView() {
  const showTrash = useUIStore((s) => s.showTrash);
  const setShowTrash = useUIStore((s) => s.setShowTrash);
  const deletedNotes = useNotesStore((s) => s.deletedNotes);
  const restoreNote = useNotesStore((s) => s.restoreNote);
  const permanentlyDeleteNote = useNotesStore((s) => s.permanentlyDeleteNote);
  const loadDeletedNotes = useNotesStore((s) => s.loadDeletedNotes);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    loadDeletedNotes();
  }, []);

  useEffect(() => {
    setCurrentTime(Date.now());
  }, []);

  if (!showTrash) return null;

  const sortedNotes = [...deletedNotes].sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));

  const handleEmptyTrash = async () => {
    for (const note of deletedNotes) {
      await permanentlyDeleteNote(note.id);
    }
    setConfirmEmpty(false);
  };

  return (
    <div
      data-trash-view
      className="p-4 h-full"
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">回收站</h2>
        <button onClick={() => setShowTrash(false)} className="text-sm hover:opacity-80">
          ✕
        </button>
      </div>

      {sortedNotes.length === 0 ? (
        <div data-empty-state className="text-center py-8 opacity-50">
          回收站为空
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {sortedNotes.map((note) => {
              const remaining = getDaysRemaining(note.deletedAt, currentTime);
              const expired = isExpired(note.deletedAt);
              return (
                <li
                  key={note.id}
                  data-note-id={note.id}
                  className="flex items-center justify-between p-2 rounded-md"
                  style={{ backgroundColor: "var(--bg-secondary)" }}
                >
                  <div>
                    <div className="text-sm font-medium">{note.title}</div>
                    <div className="text-xs opacity-50">
                      {formatDateTime(note.deletedAt)}
                      {remaining !== null &&
                        remaining > 0 &&
                        !expired &&
                        ` · ${remaining}天后永久删除`}
                      {expired && " · 即将永久删除"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreNote(note.id)}
                      className="text-sm px-2 py-1 rounded-md hover:opacity-80"
                      style={{
                        backgroundColor: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      恢复
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(note.id)}
                      className="text-sm px-2 py-1 rounded-md hover:opacity-80"
                      style={{ color: "var(--danger)" }}
                    >
                      彻底删除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <button
              onClick={() => setConfirmEmpty(true)}
              className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
              style={{ color: "var(--danger)" }}
            >
              清空回收站
            </button>
          </div>
        </>
      )}

      <AlertDialog.Root
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content
            data-confirm-delete
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 rounded-lg p-4 shadow-lg"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
          >
            <AlertDialog.Title className="text-sm font-semibold mb-2">
              彻底删除笔记
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm mb-4">
              确定要彻底删除这条笔记吗？此操作不可恢复。
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                >
                  取消
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => {
                    permanentlyDeleteNote(confirmDeleteId!);
                    setConfirmDeleteId(null);
                  }}
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ color: "var(--danger)" }}
                >
                  确定
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root
        open={confirmEmpty}
        onOpenChange={(open) => {
          if (!open) setConfirmEmpty(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
          <AlertDialog.Content
            data-confirm-empty
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 rounded-lg p-4 shadow-lg"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
          >
            <AlertDialog.Title className="text-sm font-semibold mb-2">清空回收站</AlertDialog.Title>
            <AlertDialog.Description className="text-sm mb-4">
              确定要清空回收站吗？所有笔记将被永久删除，此操作不可恢复。
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                >
                  取消
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={handleEmptyTrash}
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ color: "var(--danger)" }}
                >
                  确定
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
