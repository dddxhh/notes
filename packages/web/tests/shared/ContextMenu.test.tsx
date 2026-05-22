import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import ContextMenu from "../../src/components/shared/ContextMenu";

describe("ContextMenu", () => {
  const mockOnDelete = vi.fn();
  const mockOnMoveToFolder = vi.fn();
  const mockOnAddTag = vi.fn();
  const mockOnRename = vi.fn();
  const mockOnCopyMarkdown = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders children as trigger content", () => {
    render(
      <ContextMenu itemId="note-1" itemType="note" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Note Content</div>
      </ContextMenu>
    );
    expect(screen.getByText("Note Content")).toBeTruthy();
  });

  it("shows menu items after right-click for notes", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="note-1" itemType="note" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Note Content</div>
      </ContextMenu>
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
      <ContextMenu itemId="f1" itemType="folder" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Folder Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Folder Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.getByText("删除文件夹")).toBeTruthy();
    expect(screen.queryByText("删除笔记")).toBeNull();
  });

  it("clicking 重命名 calls onRename with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="note-1" itemType="note" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Note Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("重命名"));
    expect(mockOnRename).toHaveBeenCalledWith("note-1");
  });

  it("clicking 复制 Markdown calls onCopyMarkdown with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="note-1" itemType="note" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Note Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("复制 Markdown"));
    expect(mockOnCopyMarkdown).toHaveBeenCalledWith("note-1");
  });

  it("clicking 删除笔记 calls onDelete with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="note-1" itemType="note" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Note Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("删除笔记"));
    expect(mockOnDelete).toHaveBeenCalledWith("note-1");
  });

  it("clicking 移动到文件夹 calls onMoveToFolder with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="note-2" itemType="note" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Note Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("移动到文件夹"));
    expect(mockOnMoveToFolder).toHaveBeenCalledWith("note-2");
  });

  it("clicking 添加标签 calls onAddTag with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="note-3" itemType="note" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Note Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("添加标签"));
    expect(mockOnAddTag).toHaveBeenCalledWith("note-3");
  });

  it("does not show 复制 Markdown for folders", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="f1" itemType="folder" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Folder Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Folder Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.queryByText("复制 Markdown")).toBeNull();
  });

  it("does not show 添加标签 for folders", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="f1" itemType="folder" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag} onRename={mockOnRename} onCopyMarkdown={mockOnCopyMarkdown}>
        <div>Folder Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Folder Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.queryByText("添加标签")).toBeNull();
  });
});