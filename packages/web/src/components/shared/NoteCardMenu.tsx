import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface NoteCardMenuProps {
  onDelete: () => void;
  onMoveToFolder: () => void;
  onCopyMarkdown: () => void;
  onShare?: () => void;
}

export default function NoteCardMenu({
  onDelete,
  onMoveToFolder,
  onCopyMarkdown,
  onShare,
}: NoteCardMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="px-1 rounded hover:opacity-80 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
          aria-label="更多操作"
        >
          ⋯
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 rounded-md p-1 shadow-lg w-48"
          style={{
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
          align="end"
          sideOffset={4}
        >
          <DropdownMenu.Item
            onClick={onMoveToFolder}
            className="px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md outline-none"
          >
            移动到文件夹
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={onCopyMarkdown}
            className="px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md outline-none"
          >
            复制 Markdown
          </DropdownMenu.Item>
          {onShare && (
            <DropdownMenu.Item
              onClick={onShare}
              className="px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md outline-none"
            >
              分享
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item
            onClick={onDelete}
            className="px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md outline-none"
            style={{ color: "var(--danger)" }}
          >
            删除笔记
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
