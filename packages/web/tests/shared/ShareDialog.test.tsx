import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";

afterEach(cleanup);

const mockOnOpenChange = vi.fn();

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ open, children }: any) => (open ? children : null),
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

vi.mock("@radix-ui/react-tabs", () => ({
  Root: ({ children, defaultValue }: any) => <div data-default={defaultValue}>{children}</div>,
  List: ({ children, className }: any) => <div className={className}>{children}</div>,
  Trigger: ({ children, value }: any) => <button data-value={value}>{children}</button>,
  Content: ({ children, value }: any) => <div data-content={value}>{children}</div>,
}));

const mockAuthState = {
  serverUrl: "http://localhost:3001",
  accessToken: "test-token",
};

vi.mock("../../src/stores", () => ({
  useAuthStore: Object.assign(
    (selector: (s: typeof mockAuthState) => unknown) => selector(mockAuthState),
    { getState: () => mockAuthState },
  ),
}));

vi.mock("../../src/lib/sync-client", () => ({
  SyncClient: vi.fn().mockImplementation(() => ({
    listShares: vi.fn().mockResolvedValue([]),
    createShare: vi.fn().mockResolvedValue({ id: "s1", shareToken: "tok123", type: "public_link" }),
    deleteShare: vi.fn().mockResolvedValue(undefined),
  })),
}));

import ShareDialog from "../../src/components/shared/ShareDialog";

describe("ShareDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    noteId: "note-1",
    noteTitle: "测试笔记",
  };

  beforeEach(() => vi.clearAllMocks());

  it("renders dialog title with note title", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText(/分享.*测试笔记/)).toBeTruthy();
  });

  it("shows public link and user share tabs", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("公开链接")).toBeTruthy();
    expect(screen.getByText("指定用户")).toBeTruthy();
  });

  it("creates public link on button click", async () => {
    render(<ShareDialog {...defaultProps} />);
    const btn = screen.getByText("生成公开链接");
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByText(/tok123/)).toBeTruthy();
    });
  });
});
