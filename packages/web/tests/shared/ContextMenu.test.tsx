import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import ContextMenu from "../../src/components/shared/ContextMenu";

describe("ContextMenu", () => {
  const mockOnDelete = vi.fn();
  const mockOnMoveToFolder = vi.fn();
  const mockOnAddTag = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders children as trigger content", () => {
    render(
      <ContextMenu itemId="note-1" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag}>
        <div>Note Content</div>
      </ContextMenu>
    );
    expect(screen.getByText("Note Content")).toBeTruthy();
  });

  it("shows menu items after right-click", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="note-1" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag}>
        <div>Note Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    expect(screen.getByText("删除笔记")).toBeTruthy();
    expect(screen.getByText("移动到文件夹")).toBeTruthy();
    expect(screen.getByText("添加标签")).toBeTruthy();
  });

  it("clicking 删除笔记 calls onDelete with itemId", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu itemId="note-1" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag}>
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
      <ContextMenu itemId="note-2" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag}>
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
      <ContextMenu itemId="note-3" onDelete={mockOnDelete} onMoveToFolder={mockOnMoveToFolder} onAddTag={mockOnAddTag}>
        <div>Note Content</div>
      </ContextMenu>
    );
    const trigger = screen.getByText("Note Content");
    await user.pointer({ keys: "[MouseRight]", target: trigger });
    await user.click(screen.getByText("添加标签"));
    expect(mockOnAddTag).toHaveBeenCalledWith("note-3");
  });
});