import * as RadixContextMenu from "@radix-ui/react-context-menu";

interface ContextMenuProps {
  itemId: string;
  onDelete: (id: string) => void;
  onMoveToFolder: (id: string) => void;
  onAddTag: (id: string) => void;
  children: React.ReactNode;
}

export default function ContextMenu({ itemId, onDelete, onMoveToFolder, onAddTag, children }: ContextMenuProps) {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger>{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Content className="context-menu-content" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}>
        <RadixContextMenu.Item
          onClick={() => onDelete(itemId)}
          className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
        >
          删除笔记
        </RadixContextMenu.Item>
        <RadixContextMenu.Item
          onClick={() => onMoveToFolder(itemId)}
          className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
        >
          移动到文件夹
        </RadixContextMenu.Item>
        <RadixContextMenu.Item
          onClick={() => onAddTag(itemId)}
          className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
        >
          添加标签
        </RadixContextMenu.Item>
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  );
}