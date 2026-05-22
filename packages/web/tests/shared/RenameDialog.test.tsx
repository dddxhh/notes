import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockOnOpenChange = vi.fn();
const mockOnRename = vi.fn();

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

import RenameDialog from "../../src/components/shared/RenameDialog";

describe("RenameDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with input when open", () => {
    render(
      <RenameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentName="My Note"
        onRename={mockOnRename}
      />,
    );
    expect(screen.getByDisplayValue("My Note")).toBeTruthy();
  });

  it("does not render when closed", () => {
    render(
      <RenameDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        currentName="My Note"
        onRename={mockOnRename}
      />,
    );
    expect(screen.queryByDisplayValue("My Note")).toBeNull();
  });

  it("typing new name and clicking confirm calls onRename", async () => {
    const user = userEvent.setup();
    render(
      <RenameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentName="Old Name"
        onRename={mockOnRename}
      />,
    );
    const input = screen.getByDisplayValue("Old Name") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "New Name");
    await user.click(screen.getByText("确认"));
    expect(mockOnRename).toHaveBeenCalledWith("New Name");
  });

  it("pressing Enter calls onRename with current input value", async () => {
    const user = userEvent.setup();
    render(
      <RenameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentName="Note Title"
        onRename={mockOnRename}
      />,
    );
    const input = screen.getByDisplayValue("Note Title") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Updated Title{Enter}");
    expect(mockOnRename).toHaveBeenCalledWith("Updated Title");
  });

  it("clicking cancel calls onOpenChange(false)", async () => {
    const user = userEvent.setup();
    render(
      <RenameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentName="My Note"
        onRename={mockOnRename}
      />,
    );
    await user.click(screen.getByText("取消"));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders 重命名 title", () => {
    render(
      <RenameDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentName="My Note"
        onRename={mockOnRename}
      />,
    );
    expect(screen.getByText("重命名")).toBeTruthy();
  });
});
