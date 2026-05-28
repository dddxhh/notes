import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

let mockCurrentNote: any = null;
const mockSetCurrentNote = vi.fn();
let mockSidebarOpen = false;
const mockSetSidebarOpen = vi.fn();

vi.mock("../src/stores", () => ({
  useNotesStore: (selector?: any) => {
    const state = {
      notes: [],
      currentNote: mockCurrentNote,
      setCurrentNote: mockSetCurrentNote,
      setNotes: vi.fn(),
      addNote: vi.fn(),
      searchResult: null,
      setSearchResult: vi.fn(),
      loading: false,
      setLoading: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useFoldersStore: (selector?: any) => {
    const state = {
      folders: [],
      currentFolderId: null,
      setCurrentFolderId: vi.fn(),
      setFolders: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useTagsStore: (selector?: any) => {
    const state = { tags: [], setTags: vi.fn() };
    return selector ? selector(state) : state;
  },
  useUIStore: (selector?: any) => {
    const state = {
      editorMode: "wysiwyg",
      isMobile: true,
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
}));

vi.mock("../src/hooks", () => ({
  useStorage: () => ({
    listNotes: vi.fn().mockResolvedValue([]),
    listFolders: vi.fn().mockResolvedValue([]),
    listTags: vi.fn().mockResolvedValue([]),
    updateNote: vi.fn(),
    createNote: vi.fn().mockResolvedValue({
      id: "new1",
      title: "新笔记",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      version: 1,
    }),
    addTagsToNote: vi.fn(),
    removeTagFromNote: vi.fn(),
    createTag: vi.fn(),
    deleteNote: vi.fn(),
    getTagsForNote: vi.fn().mockResolvedValue([]),
  }),
  useSearch: () => ({
    searchInput: {},
    result: null,
    loading: false,
    executeSearch: vi.fn(),
    updateFilter: vi.fn(),
    clearSearch: vi.fn(),
  }),
  useAttachmentUpload: () => ({ uploadFile: vi.fn() }),
  useFolderTree: () => ({ tree: [] }),
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("../src/hooks/useToast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
  useToastStore: () => ({ toasts: [], addToast: vi.fn(), removeToast: vi.fn() }),
}));

vi.mock("../src/lib/markdown-serializer", () => ({
  proseMirrorJSONToMarkdown: vi.fn(() => ""),
  markdownToProseMirrorJSON: vi.fn(() => ""),
  extractTitleFromContent: vi.fn(() => "title"),
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

vi.mock("../src/hooks/useAttachmentUpload", () => ({
  useAttachmentUpload: () => ({ uploadFile: vi.fn() }),
}));

vi.mock("../src/lib/attachment-protocol", () => ({
  createAttachmentSrc: (id: string) => `attachment://${id}`,
  revokeAllObjectUrls: vi.fn(),
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

vi.mock("../src/components/QuickNote", () => ({
  default: () => <div data-testid="quick-note">QuickNote Mock</div>,
}));

vi.mock("../src/components/mobile/NoteListMobile", () => ({
  default: () => <div data-testid="note-list-mobile">NoteList Mock</div>,
}));

vi.mock("../src/components/mobile/MobileSearch", () => ({
  default: () => <div data-testid="mobile-search">MobileSearch Mock</div>,
}));

vi.mock("../src/components/mobile/MobileSettings", () => ({
  default: () => <div data-testid="mobile-settings">MobileSettings Mock</div>,
}));

vi.mock("../src/components/mobile/MobileFAB", () => ({
  default: ({ onNewNote }: any) => (
    <div data-testid="mobile-fab">
      <button onClick={onNewNote}>FAB</button>
    </div>
  ),
}));

vi.mock("../src/components/mobile/MobileDrawer", () => ({
  default: ({ onNavigate }: any) => (
    <div data-testid="mobile-drawer">
      <button onClick={onNavigate}>Drawer</button>
    </div>
  ),
}));

vi.mock("@use-gesture/react", () => ({
  useSwipe: () => ({ onSwipe: vi.fn() }),
}));

vi.mock("../src/components/shared/SearchBar", () => ({
  default: () => <div data-testid="search-bar">SearchBar Mock</div>,
}));

vi.mock("../src/components/shared/SearchFilterPanel", () => ({
  default: () => <div data-testid="search-filter-panel">Filter Mock</div>,
}));

vi.mock("../src/components/shared/SearchResultList", () => ({
  default: () => <div data-testid="search-result-list">Results Mock</div>,
}));

vi.mock("../src/components/shared/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">Theme Mock</div>,
}));

vi.mock("../src/components/shared/ModeToggle", () => ({
  default: () => <div data-testid="mode-toggle">Mode Mock</div>,
}));

vi.mock("../src/components/desktop/FolderTree", () => ({
  default: () => <div data-testid="folder-tree">FolderTree Mock</div>,
}));

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children }: any) => <div data-testid="dialog-root">{children}</div>,
  Trigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
  Portal: ({ children }: any) => children,
  Overlay: ({ children }: any) => <div data-testid="dialog-overlay">{children}</div>,
  Content: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  Close: ({ children }: any) => <div data-testid="dialog-close">{children}</div>,
  Title: ({ children }: any) => <div>{children}</div>,
  Description: ({ children }: any) => <div>{children}</div>,
}));

import MobileLayout from "../src/components/layouts/MobileLayout";

describe("MobileLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentNote = null;
    mockSidebarOpen = false;
  });

  it("renders bottom navigation with four tabs", () => {
    const { container } = render(<MobileLayout />);
    const buttons = Array.from(container.querySelectorAll("[class*='justify-around'] button"));
    const texts = buttons.map((b) => b.textContent);
    expect(texts.some((t) => t?.includes("快速笔记"))).toBe(true);
    expect(texts.some((t) => t?.includes("笔记"))).toBe(true);
    expect(texts.some((t) => t?.includes("搜索"))).toBe(true);
    expect(texts.some((t) => t?.includes("设置"))).toBe(true);
  });

  it("shows QuickNote by default (quickNote screen)", () => {
    render(<MobileLayout />);
    expect(screen.getByTestId("quick-note")).toBeTruthy();
  });

  it("switches to noteList screen when 笔记 tab is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileLayout />);
    const buttons = Array.from(container.querySelectorAll("[class*='justify-around'] button"));
    const noteTab = buttons.find(
      (b) => b.textContent?.includes("笔记") && !b.textContent?.includes("快速"),
    );
    await user.click(noteTab!);
    expect(screen.getByTestId("note-list-mobile")).toBeTruthy();
  });

  it("switches to search screen when 搜索 tab is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileLayout />);
    const buttons = Array.from(container.querySelectorAll("[class*='justify-around'] button"));
    const searchTab = buttons.find((b) => b.textContent?.includes("搜索"));
    await user.click(searchTab!);
    expect(screen.getByTestId("mobile-search")).toBeTruthy();
  });

  it("switches to settings screen when 设置 tab is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileLayout />);
    const buttons = Array.from(container.querySelectorAll("[class*='justify-around'] button"));
    const settingsTab = buttons.find((b) => b.textContent?.includes("设置"));
    await user.click(settingsTab!);
    expect(screen.getByTestId("mobile-settings")).toBeTruthy();
  });

  it("shows MobileFAB", () => {
    render(<MobileLayout />);
    expect(screen.getByTestId("mobile-fab")).toBeTruthy();
  });

  it("shows MobileDrawer", () => {
    render(<MobileLayout />);
    expect(screen.getByTestId("mobile-drawer")).toBeTruthy();
  });

  it("shows NoteView overlay when currentNote is set", () => {
    mockCurrentNote = {
      id: "note-1",
      title: "Active Note",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      version: 1,
    };
    const { container } = render(<MobileLayout />);
    expect(screen.getByDisplayValue("Active Note")).toBeTruthy();
  });

  it("has four screen states: quickNote, noteList, search, settings", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileLayout />);
    expect(screen.getByTestId("quick-note")).toBeTruthy();
    const buttons = Array.from(container.querySelectorAll("[class*='justify-around'] button"));
    const noteTab = buttons.find(
      (b) => b.textContent?.includes("笔记") && !b.textContent?.includes("快速"),
    );
    await user.click(noteTab!);
    expect(screen.getByTestId("note-list-mobile")).toBeTruthy();
    const searchTab = buttons.find((b) => b.textContent?.includes("搜索"));
    await user.click(searchTab!);
    expect(screen.getByTestId("mobile-search")).toBeTruthy();
    const settingsTab = buttons.find((b) => b.textContent?.includes("设置"));
    await user.click(settingsTab!);
    expect(screen.getByTestId("mobile-settings")).toBeTruthy();
  });
});
