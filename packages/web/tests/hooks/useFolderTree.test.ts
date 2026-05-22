import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockFolders: any[] = [];

vi.mock("../../src/stores", () => ({
  useFoldersStore: (selector: any) => selector({ folders: mockFolders }),
}));

import { buildFolderTree } from "../../src/hooks/useFolderTree";
import { useFolderTree } from "../../src/hooks/useFolderTree";
import type { Folder } from "@notes/core";

const makeFolder = (id: string, name: string, parentId: string | null, sortOrder: number = 0): Folder => ({
  id,
  name,
  parentId,
  sortOrder,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

describe("buildFolderTree", () => {
  beforeEach(() => {
    mockFolders.length = 0;
  });

  it("returns empty array for empty input", () => {
    expect(buildFolderTree([])).toEqual([]);
  });

  it("returns one root node with no children for single root folder", () => {
    const root = makeFolder("r1", "Root", null);
    const tree = buildFolderTree([root]);
    expect(tree).toHaveLength(1);
    expect(tree[0].folder).toEqual(root);
    expect(tree[0].children).toEqual([]);
  });

  it("nests child under root when child.parentId = root.id", () => {
    const root = makeFolder("r1", "Root", null);
    const child = makeFolder("c1", "Child", "r1");
    const tree = buildFolderTree([root, child]);
    expect(tree).toHaveLength(1);
    expect(tree[0].folder.id).toBe("r1");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].folder.id).toBe("c1");
  });

  it("nests two children under same root", () => {
    const root = makeFolder("r1", "Root", null);
    const child1 = makeFolder("c1", "Child1", "r1", 0);
    const child2 = makeFolder("c2", "Child2", "r1", 1);
    const tree = buildFolderTree([root, child1, child2]);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].folder.id).toBe("c1");
    expect(tree[0].children[1].folder.id).toBe("c2");
  });

  it("handles multiple root folders", () => {
    const root1 = makeFolder("r1", "Root1", null, 0);
    const root2 = makeFolder("r2", "Root2", null, 1);
    const tree = buildFolderTree([root1, root2]);
    expect(tree).toHaveLength(2);
    expect(tree[0].folder.id).toBe("r1");
    expect(tree[1].folder.id).toBe("r2");
  });

  it("handles deep nesting (3 levels)", () => {
    const root = makeFolder("r1", "Root", null);
    const child = makeFolder("c1", "Child", "r1");
    const grandchild = makeFolder("gc1", "Grandchild", "c1");
    const tree = buildFolderTree([root, child, grandchild]);
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].folder.id).toBe("gc1");
  });

  it("handles orphan folders (parentId references non-existent folder) as roots", () => {
    const root = makeFolder("r1", "Root", null);
    const orphan = makeFolder("o1", "Orphan", "nonexistent");
    const tree = buildFolderTree([root, orphan]);
    expect(tree).toHaveLength(2);
    expect(tree[1].folder.id).toBe("o1");
  });

  it("sorts roots and children by sortOrder", () => {
    const root2 = makeFolder("r2", "Root2", null, 1);
    const root1 = makeFolder("r1", "Root1", null, 0);
    const child2 = makeFolder("c2", "Child2", "r1", 2);
    const child1 = makeFolder("c1", "Child1", "r1", 1);
    const tree = buildFolderTree([root2, root1, child2, child1]);
    expect(tree[0].folder.id).toBe("r1");
    expect(tree[1].folder.id).toBe("r2");
    expect(tree[0].children[0].folder.id).toBe("c1");
    expect(tree[0].children[1].folder.id).toBe("c2");
  });
});

describe("useFolderTree", () => {
  beforeEach(() => {
    mockFolders.length = 0;
  });

  it("returns tree built from foldersStore.folders", () => {
    mockFolders.push(makeFolder("r1", "Root", null));
    mockFolders.push(makeFolder("c1", "Child", "r1"));
    const { result } = renderHook(() => useFolderTree());
    expect(result.current.tree).toHaveLength(1);
    expect(result.current.tree[0].children).toHaveLength(1);
  });
});