import { useMemo } from "react";
import { useFoldersStore } from "../stores";
import type { Folder } from "@notes/core";

export interface FolderTreeNode {
  folder: Folder;
  children: FolderTreeNode[];
  expanded: boolean;
}

export function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const nodeMap = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  for (const folder of folders) {
    nodeMap.set(folder.id, { folder, children: [], expanded: false });
  }

  for (const folder of folders) {
    const node = nodeMap.get(folder.id)!;
    if (folder.parentId && nodeMap.has(folder.parentId)) {
      nodeMap.get(folder.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortByOrder = (a: FolderTreeNode, b: FolderTreeNode) =>
    a.folder.sortOrder - b.folder.sortOrder;

  roots.sort(sortByOrder);
  for (const node of nodeMap.values()) {
    node.children.sort(sortByOrder);
  }

  return roots;
}

export function useFolderTree() {
  const folders = useFoldersStore((s) => s.folders);
  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  return { tree };
}
