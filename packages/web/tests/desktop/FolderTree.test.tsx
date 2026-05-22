import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

vi.mock("../../src/hooks", () => ({
  useFolderTree: () => ({
    tree: [
      {
        folder: {
          id: "f1",
          name: "Work",
          parentId: null,
          sortOrder: 0,
          createdAt: 1,
          updatedAt: 1,
        },
        children: [
          {
            folder: {
              id: "f2",
              name: "Projects",
              parentId: "f1",
              sortOrder: 0,
              createdAt: 1,
              updatedAt: 1,
            },
            children: [],
          },
        ],
        expanded: false,
      },
      {
        folder: {
          id: "f3",
          name: "Personal",
          parentId: null,
          sortOrder: 1,
          createdAt: 1,
          updatedAt: 1,
        },
        children: [],
        expanded: false,
      },
    ],
  }),
}));

import FolderTree from "../../src/components/desktop/FolderTree";

describe("FolderTree", () => {
  it("renders '全部笔记' as root option", () => {
    const { container } = render(<FolderTree onSelectFolder={vi.fn()} selectedFolderId={null} />);
    expect(container.textContent).toContain("全部笔记");
  });

  it("renders folder nodes with names", () => {
    const { container } = render(<FolderTree onSelectFolder={vi.fn()} selectedFolderId={null} />);
    expect(container.textContent).toContain("Work");
    expect(container.textContent).toContain("Personal");
  });

  it("calls onSelectFolder with folder id when folder name is clicked", async () => {
    const onSelectFolder = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <FolderTree onSelectFolder={onSelectFolder} selectedFolderId={null} />,
    );
    const folderNames = container.querySelectorAll("[data-folder-id]");
    await user.click(folderNames[0]!);
    expect(onSelectFolder).toHaveBeenCalledWith("f1");
  });

  it("calls onSelectFolder with null when '全部笔记' is clicked", async () => {
    const onSelectFolder = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <FolderTree onSelectFolder={onSelectFolder} selectedFolderId="f1" />,
    );
    const allNotesBtn = container.querySelector("[data-all-notes]");
    await user.click(allNotesBtn!);
    expect(onSelectFolder).toHaveBeenCalledWith(null);
  });

  it("toggles children visibility when expand/collapse button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<FolderTree onSelectFolder={vi.fn()} selectedFolderId={null} />);
    const expandBtn = container.querySelector("[data-expand-btn]");
    expect(expandBtn).toBeTruthy();
    expect(container.textContent).not.toContain("Projects");
    await user.click(expandBtn!);
    expect(container.textContent).toContain("Projects");
  });

  it("highlights selected folder", () => {
    const { container } = render(<FolderTree onSelectFolder={vi.fn()} selectedFolderId="f1" />);
    const selected = container.querySelector("[data-folder-id='f1']");
    expect(selected?.classList.toString()).toContain("bg-[rgba(59,130,246,0.1)]");
  });
});
