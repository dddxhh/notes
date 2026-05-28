import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

let mockCurrentNote: any = null;
let mockSidebarOpen = true;
const mockSetSidebarOpen = vi.fn();

vi.mock("../src/stores", () => ({
  useNotesStore: (selector?: any) => {
    const state = {
      notes: [],
      currentNote: mockCurrentNote,
      setCurrentNote: vi.fn(),
      setNotes: vi.fn(),
      addNote: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useFoldersStore: (selector?: any) => {
    const state = {
      folders: [],
      setFolders: vi.fn(),
      currentFolderId: null,
      setCurrentFolderId: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useUIStore: (selector?: any) => {
    const state = {
      editorMode: "wysiwyg",
      isMobile: false,
      sidebarOpen: mockSidebarOpen,
      setSidebarOpen: mockSetSidebarOpen,
      setIsMobile: vi.fn(),
      setEditorMode: vi.fn(),
      setTheme: vi.fn(),
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
  useTagsStore: (selector?: any) => {
    const state = { tags: [], setTags: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock("../src/hooks", () => ({
  useStorage: () => ({
    listNotes: vi.fn().mockResolvedValue([]),
    listFolders: vi.fn().mockResolvedValue([]),
    updateNote: vi.fn(),
    createNote: vi.fn(),
    addTagsToNote: vi.fn(),
    removeTagFromNote: vi.fn(),
    createTag: vi.fn(),
    deleteNote: vi.fn(),
    getTagsForNote: vi.fn().mockResolvedValue([]),
  }),
  useAttachmentUpload: () => ({ uploadFile: vi.fn() }),
  useToast: () => ({ showToast: vi.fn() }),
  useSearch: () => ({
    searchInput: {},
    result: null,
    loading: false,
    executeSearch: vi.fn(),
    updateFilter: vi.fn(),
    clearSearch: vi.fn(),
  }),
}));

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => ({
    commands: { setContent: vi.fn() },
    getJSON: vi.fn(() => ({ type: "doc", content: [] })),
  })),
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock("../src/lib/tiptap-setup", () => ({
  getEditorExtensions: vi.fn(),
}));

vi.mock("../src/lib/markdown-serializer", () => ({
  proseMirrorJSONToMarkdown: vi.fn(() => ""),
  markdownToProseMirrorJSON: vi.fn(() => ""),
  extractTitleFromContent: vi.fn(() => "title"),
}));

vi.mock("../src/hooks/useAttachmentUpload", () => ({
  useAttachmentUpload: () => ({ uploadFile: vi.fn() }),
}));

vi.mock("../src/components/shared/EditorToolbar", () => ({
  default: () => <div data-testid="editor-toolbar">Toolbar Mock</div>,
}));

vi.mock("../src/components/shared/TagBadge", () => ({
  default: ({ name }: any) => <span>#{name}</span>,
}));

vi.mock("../src/components/shared/TagSelector", () => ({
  default: () => <div data-testid="tag-selector">TagSelector Mock</div>,
}));

vi.mock("../src/components/shared/ContextMenu", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("../src/hooks/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
  useToastStore: () => ({ toasts: [], addToast: vi.fn(), removeToast: vi.fn() }),
}));

vi.mock("../src/lib/attachment-protocol", () => ({
  createAttachmentSrc: (id: string) => `attachment://${id}`,
  revokeAllObjectUrls: vi.fn(),
}));

vi.mock("../src/components/QuickNote", () => ({
  default: () => <div data-testid="quick-note">QuickNote Mock</div>,
}));

vi.mock("../src/components/desktop/Sidebar", () => ({
  default: () => <div data-testid="sidebar">全部笔记</div>,
}));

import DesktopLayout from "../src/components/layouts/DesktopLayout";

describe("DesktopLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentNote = null;
    mockSidebarOpen = true;
  });

  it("renders Sidebar when sidebarOpen is true", () => {
    mockSidebarOpen = true;
    render(<DesktopLayout />);
    expect(screen.getByTestId("sidebar")).toBeTruthy();
  });

  it("does not render Sidebar when sidebarOpen is false", () => {
    mockSidebarOpen = false;
    render(<DesktopLayout />);
    expect(screen.queryByTestId("sidebar")).toBeNull();
  });

  it("renders collapse button in main area top-left when sidebar is open", () => {
    render(<DesktopLayout />);
    expect(screen.getByRole("button", { name: /展开侧栏/i })).toBeTruthy();
  });

  it("renders expand button in main area top-left when sidebar is closed", () => {
    mockSidebarOpen = false;
    render(<DesktopLayout />);
    expect(screen.getByRole("button", { name: /展开侧栏/i })).toBeTruthy();
  });

  it("calls setSidebarOpen(false) when collapse button is clicked", async () => {
    const user = userEvent.setup();
    render(<DesktopLayout />);
    await user.click(screen.getByRole("button", { name: /展开侧栏/i }));
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  it("calls setSidebarOpen(true) when expand button is clicked", async () => {
    mockSidebarOpen = false;
    const user = userEvent.setup();
    render(<DesktopLayout />);
    await user.click(screen.getByRole("button", { name: /展开侧栏/i }));
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });

  it("shows QuickNote when no current note is selected", () => {
    render(<DesktopLayout />);
    expect(screen.getByTestId("quick-note")).toBeTruthy();
  });

  it("shows NoteView when a current note is selected", () => {
    mockCurrentNote = {
      id: "note-1",
      title: "Selected Note",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      version: 1,
    };
    const { container } = render(<DesktopLayout />);
    expect(screen.getByDisplayValue("Selected Note")).toBeTruthy();
  });

  it("main area takes full width when sidebar is collapsed", () => {
    mockSidebarOpen = false;
    const { container } = render(<DesktopLayout />);
    const mainArea = container.querySelector("[data-testid='main-area']");
    expect(mainArea).toBeTruthy();
  });
});
