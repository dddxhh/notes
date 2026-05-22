import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockOnDelete = vi.fn();
const mockOnMoveToFolder = vi.fn();
const mockOnAddTag = vi.fn();
const mockOnRename = vi.fn();
const mockOnCopyMarkdown = vi.fn();

const confirmOpen = false;
const renameOpen = false;
const moveOpen = false;

vi.mock("../../src/components/shared/ConfirmDialog", () => ({
  default: ({ open, onOpenChange, title, confirmLabel, variant, onConfirm }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span data-testid="confirm-title">{title}</span>
        <span data-testid="confirm-label">{confirmLabel}</span>
        <span data-testid="confirm-variant">{variant}</span>
        <button
          data-testid="confirm-action"
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </button>
        <button data-testid="confirm-cancel" onClick={() => onOpenChange(false)}>
          取消
        </button>
      </div>
    ) : null,
}));

vi.mock("../../src/components/shared/RenameDialog", () => ({
  default: ({ open, onOpenChange, currentName, onRename }: any) =>
    open ? (
      <div data-testid="rename-dialog">
        <span data-testid="rename-current">{currentName}</span>
        <input data-testid="rename-input" defaultValue={currentName} onChange={(e: any) => {}} />
        <button
          data-testid="rename-confirm"
          onClick={() => {
            onRename("New Name");
            onOpenChange(false);
          }}
        >
          确认
        </button>
        <button data-testid="rename-cancel" onClick={() => onOpenChange(false)}>
          取消
        </button>
      </div>
    ) : null,
}));

vi.mock("../../src/components/shared/MoveNoteDialog", () => ({
  default: ({ open, onOpenChange, noteId, currentFolderId, onMove }: any) =>
    open ? (
      <div data-testid="move-dialog">
        <span data-testid="move-note-id">{noteId}</span>
        <span data-testid="move-current-folder">{currentFolderId}</span>
        <button
          data-testid="move-confirm"
          onClick={() => {
            onMove("target-folder");
            onOpenChange(false);
          }}
        >
          确认
        </button>
        <button data-testid="move-cancel" onClick={() => onOpenChange(false)}>
          取消
        </button>
      </div>
    ) : null,
}));

import ContextMenu from "../../src/components/shared/ContextMenu";

describe("ContextMenu", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders children as trigger content", () => {
    render(
      <ContextMenu
        itemId="note-1"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    expect(screen.getByText("Note Content")).toBeTruthy();
  });

  it("shows menu items after right-click for notes", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-1"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.getByText("重命名")).toBeTruthy();
    expect(screen.getByText("移动到文件夹")).toBeTruthy();
    expect(screen.getByText("添加标签")).toBeTruthy();
    expect(screen.getByText("删除笔记")).toBeTruthy();
    expect(screen.getByText("复制 Markdown")).toBeTruthy();
  });

  it("shows '删除文件夹' for itemType='folder'", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="f1"
        itemType="folder"
        currentName="My Folder"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Folder Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Folder Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.getByText("删除文件夹")).toBeTruthy();
    expect(screen.queryByText("删除笔记")).toBeNull();
  });

  it("clicking 重命名 opens RenameDialog", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-1"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("重命名"));
    expect(screen.getByTestId("rename-dialog")).toBeTruthy();
    expect(screen.getByTestId("rename-current").textContent).toBe("My Note");
  });

  it("clicking 删除笔记 opens ConfirmDialog", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-1"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("删除笔记"));
    expect(screen.getByTestId("confirm-dialog")).toBeTruthy();
    expect(screen.getByTestId("confirm-title").textContent).toBe("删除笔记");
    expect(screen.getByTestId("confirm-variant").textContent).toBe("danger");
  });

  it("clicking 移动到文件夹 opens MoveNoteDialog", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-2"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("移动到文件夹"));
    expect(screen.getByTestId("move-dialog")).toBeTruthy();
    expect(screen.getByTestId("move-note-id").textContent).toBe("note-2");
  });

  it("clicking 添加标签 calls onAddTag with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-3"
        itemType="note"
        currentName="Note 3"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("添加标签"));
    expect(mockOnAddTag).toHaveBeenCalledWith("note-3");
  });

  it("clicking 复制 Markdown calls onCopyMarkdown with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-1"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("复制 Markdown"));
    expect(mockOnCopyMarkdown).toHaveBeenCalledWith("note-1");
  });

  it("confirming delete in ConfirmDialog calls onDelete with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-1"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("删除笔记"));
    await user.click(screen.getByTestId("confirm-action"));
    expect(mockOnDelete).toHaveBeenCalledWith("note-1");
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
  });

  it("confirming rename in RenameDialog calls onRename with itemId and newName", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-1"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("重命名"));
    await user.click(screen.getByTestId("rename-confirm"));
    expect(mockOnRename).toHaveBeenCalledWith("note-1", "New Name");
  });

  it("confirming move in MoveNoteDialog calls onMoveToFolder with itemId and targetFolderId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="note-1"
        itemType="note"
        currentName="My Note"
        currentFolderId="f1"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Note Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("移动到文件夹"));
    await user.click(screen.getByTestId("move-confirm"));
    expect(mockOnMoveToFolder).toHaveBeenCalledWith("note-1", "target-folder");
  });

  it("does not show 复制 Markdown for folders", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="f1"
        itemType="folder"
        currentName="My Folder"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Folder Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Folder Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.queryByText("复制 Markdown")).toBeNull();
  });

  it("does not show 添加标签 for folders", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="f1"
        itemType="folder"
        currentName="My Folder"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Folder Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Folder Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.queryByText("添加标签")).toBeNull();
  });

  it("does not show 移动到文件夹 for folders", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu
        itemId="f1"
        itemType="folder"
        currentName="My Folder"
        onDelete={mockOnDelete}
        onMoveToFolder={mockOnMoveToFolder}
        onAddTag={mockOnAddTag}
        onRename={mockOnRename}
        onCopyMarkdown={mockOnCopyMarkdown}
      >
        <div>Folder Content</div>
      </ContextMenu>,
    );
    const trigger = screen.getByText("Folder Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.queryByText("移动到文件夹")).toBeNull();
  });
});
