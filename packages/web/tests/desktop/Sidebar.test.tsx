import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const {
  mockNotes,
  mockTags,
  mockSetSidebarOpen,
  mockSetCurrentNote,
  mockNoteTagsMap,
  mockListNotes,
  mockListFolders,
  mockListTags,
  mockCreateNote,
  mockDeleteNote,
  mockUpdateNote,
  mockGetNotesForTag,
  mockGetTagsForNote,
  mockSharedNotes,
  mockSharedNoteIds,
} = vi.hoisted(() => ({
  mockNotes: [
    {
      id: "n1",
      title: "Note 1",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      version: 1,
    },
    {
      id: "n2",
      title: "Note 2",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: 2,
      updatedAt: 2,
      deletedAt: null,
      version: 1,
    },
    {
      id: "n3",
      title: "Deleted Note",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: 3,
      updatedAt: 3,
      deletedAt: 3,
      version: 1,
    },
  ],
  mockTags: [
    { id: "t1", name: "work" },
    { id: "t2", name: "personal" },
  ],
  mockSetSidebarOpen: vi.fn(),
  mockSetCurrentNote: vi.fn(),
  mockNoteTagsMap: new Map(),
  mockListNotes: vi.fn().mockResolvedValue([
    {
      id: "n1",
      title: "Note 1",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      version: 1,
    },
    {
      id: "n2",
      title: "Note 2",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: 2,
      updatedAt: 2,
      deletedAt: null,
      version: 1,
    },
    {
      id: "n3",
      title: "Deleted Note",
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: 3,
      updatedAt: 3,
      deletedAt: 3,
      version: 1,
    },
  ]),
  mockListFolders: vi.fn().mockResolvedValue([]),
  mockListTags: vi.fn().mockResolvedValue([
    { id: "t1", name: "work" },
    { id: "t2", name: "personal" },
  ]),
  mockCreateNote: vi.fn().mockResolvedValue({
    id: "n1",
    title: "Note 1",
    contentJson: "",
    mdText: "",
    folderId: null,
    type: "rich",
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    version: 1,
  }),
  mockDeleteNote: vi.fn().mockResolvedValue(undefined),
  mockUpdateNote: vi.fn().mockResolvedValue({
    id: "n1",
    title: "Note 1",
    contentJson: "",
    mdText: "",
    folderId: null,
    type: "rich",
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    version: 1,
  }),
  mockGetNotesForTag: vi.fn().mockResolvedValue([]),
  mockGetTagsForNote: vi.fn().mockResolvedValue([]),
  mockSharedNotes: [],
  mockSharedNoteIds: new Set<string>(),
}));

let mockSidebarOpen = true;

vi.mock("../../src/stores", () => ({
  useNotesStore: (selector: any) =>
    selector({
      notes: mockNotes,
      currentNote: null,
      sharedNotes: mockSharedNotes,
      sharedNoteIds: mockSharedNoteIds,
      setCurrentNote: mockSetCurrentNote,
      setNotes: vi.fn(),
      addNote: vi.fn(),
      removeNoteFromList: vi.fn(),
      noteTagsMap: mockNoteTagsMap,
      setNoteTagsMap: vi.fn(),
      setSharedNoteIds: vi.fn(),
    }),
  useFoldersStore: (selector: any) =>
    selector({
      folders: [],
      currentFolderId: null,
      setCurrentFolderId: vi.fn(),
    }),
  useTagsStore: (selector: any) =>
    selector({
      tags: mockTags,
      setTags: vi.fn(),
    }),
  useUIStore: (selector: any) =>
    selector({
      sidebarOpen: mockSidebarOpen,
      setSidebarOpen: mockSetSidebarOpen,
      theme: "light",
      editorMode: "wysiwyg",
      isMobile: false,
    }),
  useSlashCommandStore: (selector: any) =>
    selector({ pendingUpload: null, setPendingUpload: vi.fn() }),
  useAttachmentsStore: (selector: any) => selector({ attachments: [], addAttachment: vi.fn() }),
}));

vi.mock("../../src/hooks", () => ({
  useStorage: () => ({
    listNotes: mockListNotes,
    listFolders: mockListFolders,
    listTags: mockListTags,
    createNote: mockCreateNote,
    deleteNote: mockDeleteNote,
    updateNote: mockUpdateNote,
    getNotesForTag: mockGetNotesForTag,
    getTagsForNote: mockGetTagsForNote,
  }),
  useSearch: () => ({
    searchInput: {},
    result: null,
    loading: false,
    executeSearch: vi.fn(),
    updateFilter: vi.fn(),
    clearSearch: vi.fn(),
  }),
}));

vi.mock("../../src/components/desktop/FolderTreeDropdown", () => ({
  default: () => <div data-testid="folder-tree-dropdown">FolderTreeDropdown</div>,
}));

vi.mock("../../src/components/shared/SearchBar", () => ({
  default: ({ query, onQueryChange, showFilter, onToggleFilter }: any) => (
    <div data-testid="search-bar">
      <input value={query} onChange={(e) => onQueryChange(e.target.value)} />
      <button onClick={onToggleFilter}>filter</button>
    </div>
  ),
}));

vi.mock("../../src/components/shared/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("../../src/lib/markdown-serializer", () => ({
  extractTitleFromContent: vi.fn((content) => content?.slice(0, 50) || ""),
  serializeToMarkdown: vi.fn(() => ""),
  parseMarkdown: vi.fn(() => ({})),
}));

vi.mock("../../src/lib", () => ({
  getStorage: vi.fn(() => ({
    listNotes: vi.fn().mockResolvedValue([]),
    listFolders: vi.fn().mockResolvedValue([]),
    listTags: vi.fn().mockResolvedValue([]),
    createNote: vi.fn().mockResolvedValue({}),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    updateNote: vi.fn().mockResolvedValue({}),
    getNotesForTag: vi.fn().mockResolvedValue([]),
    getTagsForNote: vi.fn().mockResolvedValue([]),
  })),
  initStorage: vi.fn(),
  closeStorage: vi.fn(),
}));

vi.mock("../../src/components/shared/DataManagementPanel", () => ({
  default: () => <div data-testid="data-management-panel">DataManagementPanel</div>,
}));

vi.mock("../../src/components/shared/ShareDialog", () => ({
  default: () => <div data-testid="share-dialog">ShareDialog</div>,
}));

vi.mock("../../src/stores/authStore", () => {
  const mockAuthStore = {
    serverUrl: null,
    accessToken: null,
    user: null,
  };
  const useAuthStore = (selector: any) => selector(mockAuthStore);
  useAuthStore.getState = () => mockAuthStore;
  return { useAuthStore };
});

vi.mock("../../src/lib/sync-client", () => ({
  SyncClient: vi.fn().mockImplementation(() => ({
    listShares: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../src/components/shared/DeleteTagDialog", () => ({
  default: () => null,
}));

vi.mock("../../src/components/shared/DeleteNoteDialog", () => ({
  default: () => null,
}));

vi.mock("../../src/components/shared/MoveNoteDialog", () => ({
  default: () => null,
}));

vi.mock("../../src/components/shared/SearchFilterPanel", () => ({
  default: () => <div data-testid="search-filter-panel">SearchFilterPanel</div>,
}));

vi.mock("../../src/components/shared/NoteCard", () => ({
  default: ({ note, onClick }: any) => (
    <div data-testid={`note-card-${note.id}`} onClick={() => onClick(note)}>
      {note.title}
    </div>
  ),
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: any) => ({
    getTotalSize: () => count * 80,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 3) }, (_, i) => ({
        key: `note-${i}`,
        index: i,
        start: i * 80,
        size: 80,
      })),
  }),
}));

import Sidebar from "../../src/components/desktop/Sidebar";

describe("Sidebar (dual-column focus design)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebarOpen = true;
  });

  it("renders FolderTreeDropdown in top section", () => {
    render(<Sidebar />);
    expect(screen.getByTestId("folder-tree-dropdown")).toBeTruthy();
  });

  it("renders SearchBar in top section", () => {
    render(<Sidebar />);
    expect(screen.getByTestId("search-bar")).toBeTruthy();
  });

  it("renders ThemeToggle in bottom section", () => {
    render(<Sidebar />);
    expect(screen.getByTestId("theme-toggle")).toBeTruthy();
  });

  it("renders collapse button", () => {
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: /收起/i })).toBeTruthy();
  });

  it("renders tag filter buttons", () => {
    render(<Sidebar />);
    expect(screen.getByText("work")).toBeTruthy();
    expect(screen.getByText("personal")).toBeTruthy();
  });

  it("renders virtual scroll note list with active notes", () => {
    render(<Sidebar />);
    expect(screen.getByTestId("note-card-n1")).toBeTruthy();
    expect(screen.getByTestId("note-card-n2")).toBeTruthy();
  });

  it("does not render deleted notes", () => {
    render(<Sidebar />);
    expect(screen.queryByTestId("note-card-n3")).toBeNull();
  });

  it("calls setSidebarOpen(false) when collapse button is clicked", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    await user.click(screen.getByRole("button", { name: /收起/i }));
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  it("has 320px width when sidebar is open", () => {
    const { container } = render(<Sidebar />);
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar.style.width).toBe("320px");
  });

  it("has 0px width when sidebar is closed", () => {
    mockSidebarOpen = false;
    const { container } = render(<Sidebar />);
    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar.style.width).toBe("0px");
  });
});
