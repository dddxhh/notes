import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Folder } from "@notes/core";

afterEach(cleanup);

const mockOnOpenChange = vi.fn();
const mockOnMove = vi.fn();

const mockFolders: Folder[] = [
  { id: "f1", name: "Work", parentId: null, sortOrder: 0, createdAt: 1, updatedAt: 1 },
  { id: "f2", name: "Projects", parentId: "f1", sortOrder: 0, createdAt: 1, updatedAt: 1 },
  { id: "f3", name: "Personal", parentId: null, sortOrder: 1, createdAt: 1, updatedAt: 1 },
];

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ open, onOpenChange, children }: any) => (open ? children : null),
  Trigger: ({ children }: any) => children,
  Portal: ({ children }: any) => children,
  Overlay: ({ className, children }: any) => <div className={className}>{children}</div>,
  Content: ({ children, className }: any) => <div className={className}>{children}</div>,
  Title: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  Description: ({ children }: any) => <p>{children}</p>,
  Close: ({ children, className }: any) => (
    <button className={className} onClick={() => mockOnOpenChange(false)}>
      {children}
    </button>
  ),
}));

vi.mock("../../src/stores", () => ({
  useFoldersStore: (selector?: any) =>
    selector ? selector({ folders: mockFolders }) : { folders: mockFolders },
  useNotesStore: vi.fn(),
  useUIStore: vi.fn(),
  useTagsStore: vi.fn(),
  useAttachmentsStore: vi.fn(),
  useSlashCommandStore: vi.fn(),
}));

import MoveNoteDialog from "../../src/components/shared/MoveNoteDialog";

describe("MoveNoteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders folder list when open", () => {
    render(
      <MoveNoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        noteId="n1"
        currentFolderId="f1"
        onMove={mockOnMove}
      />,
    );
    expect(screen.getByText("Work")).toBeTruthy();
    expect(screen.getByText("Personal")).toBeTruthy();
  });

  it("does not render when closed", () => {
    render(
      <MoveNoteDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        noteId="n1"
        currentFolderId="f1"
        onMove={mockOnMove}
      />,
    );
    expect(screen.queryByText("Work")).toBeNull();
  });

  it("shows current folder as disabled", () => {
    render(
      <MoveNoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        noteId="n1"
        currentFolderId="f1"
        onMove={mockOnMove}
      />,
    );
    const currentFolder = screen.getByText("Work");
    const li = currentFolder.closest("li");
    expect(li?.className).toContain("opacity-50");
  });

  it("clicking a folder calls onMove with folder id", async () => {
    const user = userEvent.setup();
    render(
      <MoveNoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        noteId="n1"
        currentFolderId="f1"
        onMove={mockOnMove}
      />,
    );
    await user.click(screen.getByText("Personal"));
    expect(mockOnMove).toHaveBeenCalledWith("f3");
  });

  it("clicking cancel calls onOpenChange(false)", async () => {
    const user = userEvent.setup();
    render(
      <MoveNoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        noteId="n1"
        currentFolderId="f1"
        onMove={mockOnMove}
      />,
    );
    await user.click(screen.getByText("取消"));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders 移动到文件夹 title", () => {
    render(
      <MoveNoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        noteId="n1"
        currentFolderId="f1"
        onMove={mockOnMove}
      />,
    );
    expect(screen.getByText("移动到文件夹")).toBeTruthy();
  });

  it("clicking current folder does not call onMove", async () => {
    const user = userEvent.setup();
    render(
      <MoveNoteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        noteId="n1"
        currentFolderId="f1"
        onMove={mockOnMove}
      />,
    );
    const currentFolder = screen.getByText("Work");
    await user.click(currentFolder);
    expect(mockOnMove).not.toHaveBeenCalled();
  });
});
