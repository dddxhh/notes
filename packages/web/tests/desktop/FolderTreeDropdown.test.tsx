import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

let mockCurrentFolderId: string | null = null;
const mockSetCurrentFolderId = vi.fn();

const mockFolders = [
  { id: "f1", name: "Work", parentId: null, sortOrder: 0, createdAt: 1, updatedAt: 1 },
  { id: "f2", name: "Personal", parentId: null, sortOrder: 1, createdAt: 1, updatedAt: 1 },
];

vi.mock("../../src/stores", () => ({
  useFoldersStore: (selector: any) =>
    selector({
      folders: mockFolders,
      currentFolderId: mockCurrentFolderId,
      setCurrentFolderId: mockSetCurrentFolderId,
    }),
}));

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
        children: [],
        expanded: false,
      },
      {
        folder: {
          id: "f2",
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

vi.mock("@radix-ui/react-popover", () => ({
  Root: ({ children }: any) => <div data-testid="popover-root">{children}</div>,
  Trigger: ({ children, asChild }: any) => <div data-testid="popover-trigger">{children}</div>,
  Portal: ({ children }: any) => children,
  Content: ({ children, className, align, sideOffset }: any) => (
    <div data-testid="popover-content" className={className}>
      {children}
    </div>
  ),
  Anchor: ({ children }: any) => children,
  Close: ({ children }: any) => children,
}));

import FolderTreeDropdown from "../../src/components/desktop/FolderTreeDropdown";

describe("FolderTreeDropdown", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockCurrentFolderId = null;
  });

  it("renders trigger button showing '全部笔记' when no folder selected", () => {
    render(<FolderTreeDropdown />);
    expect(screen.getByRole("button", { name: /全部笔记/ })).toBeTruthy();
  });

  it("renders trigger button showing folder name when folder is selected", () => {
    mockCurrentFolderId = "f1";
    render(<FolderTreeDropdown />);
    expect(screen.getByRole("button", { name: /Work/ })).toBeTruthy();
  });

  it("calls setCurrentFolderId when folder is selected in tree", async () => {
    const user = userEvent.setup();
    render(<FolderTreeDropdown />);
    const workFolder = screen.getByText("Work");
    await user.click(workFolder);
    expect(mockSetCurrentFolderId).toHaveBeenCalledWith("f1");
  });

  it("calls setCurrentFolderId with null when '全部笔记' is clicked", async () => {
    const user = userEvent.setup();
    mockCurrentFolderId = "f1";
    render(<FolderTreeDropdown />);
    const allNotes = screen.getByText("全部笔记");
    await user.click(allNotes);
    expect(mockSetCurrentFolderId).toHaveBeenCalledWith(null);
  });
});
