import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockOnOpenChange = vi.fn();
const mockOnConfirm = vi.fn();

vi.mock("@radix-ui/react-alert-dialog", () => ({
  Root: ({ open, onOpenChange, children }: any) => open ? <div data-alert-dialog-root>{children}</div> : null,
  Trigger: ({ children }: any) => children,
  Portal: ({ children }: any) => children,
  Overlay: ({ className, children }: any) => <div className={className}>{children}</div>,
  Content: ({ children, className }: any) => <div className={className}>{children}</div>,
  Title: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  Description: ({ children }: any) => <p>{children}</p>,
  Action: ({ children, className, onClick, asChild }: any) => asChild ? children : <button className={className} onClick={onClick}>{children}</button>,
  Cancel: ({ children, className, onClick, asChild }: any) => asChild ? children : <button className={className} onClick={onClick || (() => mockOnOpenChange(false))}>{children}</button>,
}));

import ConfirmDialog from "../../src/components/shared/ConfirmDialog";

describe("ConfirmDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and description when open", () => {
    render(<ConfirmDialog open={true} onOpenChange={mockOnOpenChange} title="确认删除" description="此操作不可恢复" confirmLabel="删除" onConfirm={mockOnConfirm} />);
    expect(screen.getByText("确认删除")).toBeTruthy();
    expect(screen.getByText("此操作不可恢复")).toBeTruthy();
  });

  it("does not render when closed", () => {
    render(<ConfirmDialog open={false} onOpenChange={mockOnOpenChange} title="确认删除" description="此操作不可恢复" confirmLabel="删除" onConfirm={mockOnConfirm} />);
    expect(screen.queryByText("确认删除")).toBeNull();
  });

  it("clicking confirm calls onConfirm then onOpenChange(false)", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog open={true} onOpenChange={mockOnOpenChange} title="确认删除" description="此操作不可恢复" confirmLabel="删除" onConfirm={mockOnConfirm} />);
    await user.click(screen.getByText("删除"));
    expect(mockOnConfirm).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("clicking cancel calls onOpenChange(false)", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog open={true} onOpenChange={mockOnOpenChange} title="确认删除" description="此操作不可恢复" confirmLabel="删除" onConfirm={mockOnConfirm} />);
    await user.click(screen.getByText("取消"));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders confirmLabel as button text", () => {
    render(<ConfirmDialog open={true} onOpenChange={mockOnOpenChange} title="确认" description="desc" confirmLabel="确认清空" onConfirm={mockOnConfirm} />);
    expect(screen.getByText("确认清空")).toBeTruthy();
  });

  it("renders danger variant with danger styling", () => {
    render(<ConfirmDialog open={true} onOpenChange={mockOnOpenChange} title="确认" description="desc" confirmLabel="删除" variant="danger" onConfirm={mockOnConfirm} />);
    const confirmBtn = screen.getByText("删除");
    expect(confirmBtn.style.color).toBe("var(--danger)");
  });

  it("renders default variant without danger styling", () => {
    render(<ConfirmDialog open={true} onOpenChange={mockOnOpenChange} title="提示" description="desc" confirmLabel="确认" variant="default" onConfirm={mockOnConfirm} />);
    const confirmBtn = screen.getByRole("button", { name: "确认" });
    expect(confirmBtn.style.color).not.toBe("var(--danger)");
  });
});