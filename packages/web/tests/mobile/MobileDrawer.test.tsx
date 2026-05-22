import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockFolders = [
  { id: "f1", name: "Work", parentId: null, sortOrder: 0, createdAt: 1, updatedAt: 1 },
  { id: "f2", name: "Personal", parentId: null, sortOrder: 1, createdAt: 1, updatedAt: 1 },
];

const mockTags = [
  { id: "t1", name: "work" },
  { id: "t2", name: "personal" },
];

vi.mock("../../src/stores", () => ({
  useNotesStore: (selector?: any) => {
    const state = { notes: [], currentNote: null, setCurrentNote: vi.fn(), setNotes: vi.fn() };
    return selector ? selector(state) : state;
  },
  useFoldersStore: (selector?: any) => {
    const state = {
      folders: mockFolders,
      currentFolderId: null,
      setCurrentFolderId: vi.fn(),
      setFolders: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useTagsStore: (selector?: any) => {
    const state = { tags: mockTags, setTags: vi.fn() };
    return selector ? selector(state) : state;
  },
  useUIStore: (selector?: any) => {
    const state = {
      theme: "light",
      editorMode: "wysiwyg",
      sidebarOpen: true,
      isMobile: true,
      setEditorMode: vi.fn(),
      setTheme: vi.fn(),
      setSidebarOpen: vi.fn(),
      setIsMobile: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useSlashCommandStore: (selector?: any) => {
    const state = { pendingUpload: null, setPendingUpload: vi.fn() };
    return selector ? selector(state) : state;
  },
  useAttachmentsStore: (selector?: any) => {
    const state = { attachments: [], addAttachment: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock("../../src/hooks", () => ({
  useFolderTree: () => ({
    tree: mockFolders.map((f) => ({ folder: f, children: [], expanded: false })),
  }),
  useStorage: () => ({
    listNotes: vi.fn().mockResolvedValue([]),
    listFolders: vi.fn().mockResolvedValue(mockFolders),
    listTags: vi.fn().mockResolvedValue(mockTags),
  }),
}));

vi.mock("../../src/components/desktop/FolderTree", () => ({
  default: (props: any) => (
    <div data-testid="folder-tree">
      <div data-all-notes onClick={() => props.onSelectFolder(null)}>
        全部笔记
      </div>
      {mockFolders.map((f) => (
        <div key={f.id} data-folder-id={f.id} onClick={() => props.onSelectFolder(f.id)}>
          {f.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dialog-root" data-open={open}>
      {children}
    </div>
  ),
  Trigger: ({ children, asChild }: any) => <div data-testid="dialog-trigger">{children}</div>,
  Portal: ({ children }: any) => children,
  Overlay: ({ children }: any) => <div data-testid="dialog-overlay">{children}</div>,
  Content: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  Close: ({ children }: any) => <div data-testid="dialog-close">{children}</div>,
  Title: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  Description: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
}));

import MobileDrawer from "../../src/components/mobile/MobileDrawer";

describe("MobileDrawer", () => {
  it("renders dialog trigger", () => {
    render(<MobileDrawer />);
    expect(screen.getByTestId("dialog-trigger")).toBeTruthy();
  });

  it("renders folder tree when open", () => {
    render(<MobileDrawer open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByTestId("folder-tree")).toBeTruthy();
  });

  it("renders tag list navigation", () => {
    render(<MobileDrawer open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("#work")).toBeTruthy();
    expect(screen.getByText("#personal")).toBeTruthy();
  });

  it("renders close button in drawer", () => {
    render(<MobileDrawer open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByLabelText("关闭")).toBeTruthy();
  });

  it("calls onNavigate when folder is selected", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<MobileDrawer open={true} onOpenChange={vi.fn()} onNavigate={onNavigate} />);
    await user.click(screen.getByText("Work"));
    expect(onNavigate).toHaveBeenCalled();
  });
});
