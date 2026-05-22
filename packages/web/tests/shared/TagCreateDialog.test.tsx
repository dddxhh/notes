import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockOnClose = vi.fn();
const mockOnCreate = vi.fn();

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ open, onOpenChange, children }: any) => (open ? children : null),
  Trigger: ({ children }: any) => children,
  Portal: ({ children }: any) => children,
  Overlay: ({ children, className }: any) => <div className={className}>{children}</div>,
  Content: ({ children, className }: any) => <div className={className}>{children}</div>,
  Title: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  Description: ({ children }: any) => <p>{children}</p>,
  Close: ({ children, className }: any) => (
    <button className={className} onClick={() => mockOnClose()}>
      {children}
    </button>
  ),
}));

import TagCreateDialog from "../../src/components/shared/TagCreateDialog";

describe("TagCreateDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with input field when open", () => {
    render(<TagCreateDialog open={true} onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.getByPlaceholderText("标签名称")).toBeTruthy();
  });

  it("does not render when closed", () => {
    render(<TagCreateDialog open={false} onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.queryByPlaceholderText("标签名称")).toBeNull();
  });

  it("typing in input updates value", async () => {
    const user = userEvent.setup();
    render(<TagCreateDialog open={true} onClose={mockOnClose} onCreate={mockOnCreate} />);
    const input = screen.getByPlaceholderText("标签名称") as HTMLInputElement;
    await user.type(input, "work");
    expect(input.value).toBe("work");
  });

  it("clicking 创建 button calls onCreate with input value", async () => {
    const user = userEvent.setup();
    render(<TagCreateDialog open={true} onClose={mockOnClose} onCreate={mockOnCreate} />);
    const input = screen.getByPlaceholderText("标签名称") as HTMLInputElement;
    await user.type(input, "personal");
    const createBtn = screen.getByText("创建");
    await user.click(createBtn);
    expect(mockOnCreate).toHaveBeenCalledWith("personal");
  });

  it("does not submit when input is empty", () => {
    render(<TagCreateDialog open={true} onClose={mockOnClose} onCreate={mockOnCreate} />);
    const createBtn = screen.getByText("创建") as HTMLButtonElement;
    expect(createBtn.disabled).toBe(true);
  });

  it("clicking close button calls onClose", async () => {
    const user = userEvent.setup();
    render(<TagCreateDialog open={true} onClose={mockOnClose} onCreate={mockOnCreate} />);
    const closeBtn = screen.getByText("✕");
    await user.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
