import { useState, useRef } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useStorage } from "../../hooks";
import { useNotesStore, useFoldersStore, useTagsStore } from "../../stores";
import {
  detectImportFormat,
  importJSON,
  importMarkdownZip,
  importMarkdownFiles,
} from "../../lib/import";
import type { DataDump } from "@notes/core";

export default function ImportPanel() {
  const { restoreAll, listNotes, listFolders, listTags } = useStorage();
  const setNotes = useNotesStore((s) => s.setNotes);
  const setFolders = useFoldersStore((s) => s.setFolders);
  const setTags = useTagsStore((s) => s.setTags);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDump, setPendingDump] = useState<DataDump | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setImporting(true);
    try {
      const format = detectImportFormat(files[0]);
      if (format === "json") {
        const dump = await importJSON(files[0]);
        setPendingDump(dump);
        setConfirmOpen(true);
      } else if (format === "markdown-zip") {
        const dump = await importMarkdownZip(files[0]);
        setPendingDump(dump);
        setConfirmOpen(true);
      } else if (format === "markdown-files") {
        const dump = await importMarkdownFiles(Array.from(files));
        setPendingDump(dump);
        setConfirmOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingDump) return;
    setImporting(true);
    setError(null);
    try {
      await restoreAll(pendingDump);
      const notes = await listNotes();
      setNotes(notes);
      const folders = await listFolders();
      setFolders(folders);
      const tags = await listTags();
      setTags(tags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
      setConfirmOpen(false);
      setPendingDump(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">数据导入</h3>
      {importing && (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          正在导入...
        </div>
      )}
      {error && (
        <div className="text-sm p-2 rounded" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      )}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="text-sm px-3 py-1.5 rounded-md hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: "var(--accent)", color: "white" }}
      >
        选择文件导入
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.zip,.md"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        支持 JSON 备份、Markdown 包（zip）、Markdown 文件（.md）。导入将替换现有数据。
      </p>
      <AlertDialog.Root
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setPendingDump(null);
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
          <AlertDialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-4 shadow-lg z-[61]"
            style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
          >
            <AlertDialog.Title className="text-sm font-semibold mb-2">确认导入</AlertDialog.Title>
            <AlertDialog.Description className="text-sm mb-4">
              导入将替换所有现有数据。建议先导出当前数据作为备份。确定继续？
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
                  onClick={handleConfirmImport}
                  className="text-sm px-3 py-1.5 rounded-md hover:opacity-80"
                  style={{ color: "var(--danger)" }}
                >
                  确定导入
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
