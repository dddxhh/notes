import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

interface TagCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export default function TagCreateDialog({ open, onClose, onCreate }: TagCreateDialogProps) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName("");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-6 shadow-lg" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
          <Dialog.Title className="text-lg font-bold mb-4">新建标签</Dialog.Title>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="标签名称"
            className="w-full rounded-md border px-3 py-2 mb-4 outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
          />
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button className="rounded-md px-3 py-1.5 hover:opacity-80" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>
                ✕
              </button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="rounded-md px-3 py-1.5 font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}