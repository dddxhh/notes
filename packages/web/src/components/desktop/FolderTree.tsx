import { useState } from "react";
import { useFolderTree, type FolderTreeNode } from "../../hooks";

interface FolderTreeProps {
  onSelectFolder: (id: string | null) => void;
  selectedFolderId: string | null;
}

function TreeNode({
  node,
  onSelectFolder,
  selectedFolderId,
  expandedIds,
  setExpandedIds,
}: {
  node: FolderTreeNode;
  onSelectFolder: (id: string | null) => void;
  selectedFolderId: string | null;
  expandedIds: Set<string>;
  setExpandedIds: (ids: Set<string>) => void;
}) {
  const isExpanded = expandedIds.has(node.folder.id);
  const isSelected = selectedFolderId === node.folder.id;
  const hasChildren = node.children.length > 0;

  const toggleExpand = () => {
    const next = new Set(expandedIds);
    if (isExpanded) {
      next.delete(node.folder.id);
    } else {
      next.add(node.folder.id);
    }
    setExpandedIds(next);
  };

  return (
    <li>
      <div className="flex items-center gap-1">
        {hasChildren && (
          <button
            data-expand-btn
            onClick={toggleExpand}
            className="text-xs w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <span
          data-folder-id={node.folder.id}
          onClick={() => onSelectFolder(node.folder.id)}
          className={`text-sm px-2 py-1 rounded hover:bg-[var(--hover-bg)] cursor-pointer ${
            isSelected ? "bg-[rgba(59,130,246,0.1)] text-[var(--accent)]" : ""
          }`}
        >
          {node.folder.name}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <ul className="ml-4 mt-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.folder.id}
              node={child}
              onSelectFolder={onSelectFolder}
              selectedFolderId={selectedFolderId}
              expandedIds={expandedIds}
              setExpandedIds={setExpandedIds}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FolderTree({ onSelectFolder, selectedFolderId }: FolderTreeProps) {
  const { tree } = useFolderTree();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  return (
    <div>
      <div
        data-all-notes
        onClick={() => onSelectFolder(null)}
        className={`text-sm px-2 py-1 rounded hover:bg-[var(--hover-bg)] cursor-pointer ${
          selectedFolderId === null ? "bg-[rgba(59,130,246,0.1)] text-[var(--accent)]" : ""
        }`}
      >
        全部笔记
      </div>
      <ul className="ml-2 mt-1">
        {tree.map((node) => (
          <TreeNode
            key={node.folder.id}
            node={node}
            onSelectFolder={onSelectFolder}
            selectedFolderId={selectedFolderId}
            expandedIds={expandedIds}
            setExpandedIds={setExpandedIds}
          />
        ))}
      </ul>
    </div>
  );
}