import * as RadixContextMenu from "@radix-ui/react-context-menu";

interface ContextMenuProps {
  itemId: string;
  itemType: "note" | "folder";
  onDelete: (id: string) => void;
  onMoveToFolder: (id: string) => void;
  onAddTag: (id: string) => void;
  onRename: (id: string) => void;
  onCopyMarkdown: (id: string) => void;
  children: React.ReactNode;
}

export default function ContextMenu({
  itemId,
  itemType,
  onDelete,
  onMoveToFolder,
  onAddTag,
  onRename,
  onCopyMarkdown,
  children,
}: ContextMenuProps) {
  const deleteLabel = itemType === "folder" ? "删除文件夹" : "删除笔记";

  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger>{children}</RadixContextMenu.Trigger>
      <RadixContextMenu.Content
        className="context-menu-content"
        style={{
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <RadixContextMenu.Item
          onClick={() => onRename(itemId)}
          className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
        >
          重命名
        </RadixContextMenu.Item>
        {itemType === "note" && (
          <RadixContextMenu.Item
            onClick={() => onMoveToFolder(itemId)}
            className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          >
            移动到文件夹
          </RadixContextMenu.Item>
        )}
        {itemType === "note" && (
          <RadixContextMenu.Item
            onClick={() => onAddTag(itemId)}
            className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          >
            添加标签
          </RadixContextMenu.Item>
        )}
        {itemType === "note" && (
          <RadixContextMenu.Item
            onClick={() => onCopyMarkdown(itemId)}
            className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          >
            复制 Markdown
          </RadixContextMenu.Item>
        )}
        <RadixContextMenu.Item
          onClick={() => onDelete(itemId)}
          className="context-menu-item px-3 py-2 text-sm cursor-pointer hover:opacity-80 rounded-md"
          style={{ color: "var(--danger)" }}
        >
          {deleteLabel}
        </RadixContextMenu.Item>
      </RadixContextMenu.Content>
    </RadixContextMenu.Root>
  );
}