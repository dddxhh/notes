import * as AlertDialog from "@radix-ui/react-alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const confirmStyle =
    variant === "danger"
      ? { color: "var(--danger)" }
      : { color: "var(--text-primary)" };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
        <AlertDialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-lg p-6 shadow-lg"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        >
          <AlertDialog.Title className="text-lg font-bold mb-2">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm mb-4">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-md px-3 py-1.5 hover:opacity-80"
                style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
              >
                取消
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={handleConfirm}
                className="rounded-md px-3 py-1.5 font-medium hover:opacity-80"
                style={confirmStyle}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}