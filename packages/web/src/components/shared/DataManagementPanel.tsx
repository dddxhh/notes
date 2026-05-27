import ExportPanel from "./ExportPanel";
import ImportPanel from "./ImportPanel";
import * as Dialog from "@radix-ui/react-dialog";

interface DataManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DataManagementPanel({ open, onOpenChange }: DataManagementPanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 max-h-[80vh] rounded-lg p-6 overflow-auto shadow-lg z-50"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">数据管理</Dialog.Title>
          <Dialog.Close asChild>
            <button
              aria-label="关闭"
              className="absolute top-3 right-3 p-2 rounded-md hover:opacity-80"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              ✕
            </button>
          </Dialog.Close>
          <ExportPanel />
          <div className="border-t my-4" style={{ borderColor: "var(--border-color)" }} />
          <ImportPanel />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
