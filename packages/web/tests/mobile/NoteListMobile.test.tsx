import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const {
  mockListNotes,
  mockSetNotes,
  mockSetCurrentNote,
  mockListFolders,
  mockSetFolders,
  mockSetCurrentFolderId,
  mockNoteTagsMap,
  mockCreateNote,
  mockDeleteNote,
  mockUpdateNote,
  mockGetNotesForTag,
  mockGetTagsForNote,
} = vi.hoisted(() => ({
  mockListNotes: vi.fn(),
  mockSetNotes: vi.fn(),
  mockSetCurrentNote: vi.fn(),
  mockListFolders: vi.fn(),
  mockSetFolders: vi.fn(),
  mockSetCurrentFolderId: vi.fn(),
  mockNoteTagsMap: new Map(),
  mockCreateNote: vi.fn(),
  mockDeleteNote: vi.fn().mockResolvedValue(undefined),
  mockUpdateNote: vi.fn(),
  mockGetNotesForTag: vi.fn().mockResolvedValue([]),
  mockGetTagsForNote: vi.fn().mockResolvedValue([]),
}));

let mockNotes: any[] = [];
let mockTags: { id: string; name: string }[] = [];
let mockFolders: any[] = [];

vi.mock("../../src/stores", () => ({
  useNotesStore: (selector?: any) =>
    selector
      ? selector({
          notes: mockNotes,
          currentNote: null,
          sharedNotes: [],
          sharedNoteIds: new Set(),
          setNotes: mockSetNotes,
          addNote: vi.fn(),
          setCurrentNote: mockSetCurrentNote,
          removeNoteFromList: vi.fn(),
          noteTagsMap: mockNoteTagsMap,
          setNoteTagsMap: vi.fn(),
        })
      : { notes: mockNotes, sharedNotes: [], sharedNoteIds: new Set() },
  useFoldersStore: (selector?: any) =>
    selector
      ? selector({
          folders: mockFolders,
          currentFolderId: null,
          setFolders: mockSetFolders,
          addFolder: vi.fn(),
          removeFolder: vi.fn(),
          setCurrentFolderId: mockSetCurrentFolderId,
        })
      : { folders: mockFolders },
  useTagsStore: (selector?: any) =>
    selector
      ? selector({
          tags: mockTags,
          setTags: vi.fn(),
          addTag: vi.fn(),
          removeTag: vi.fn(),
          loading: false,
          setLoading: vi.fn(),
        })
      : { tags: mockTags },
}));

vi.mock("../../src/hooks", () => ({
  useStorage: () => ({
    listNotes: mockListNotes,
    listFolders: mockListFolders,
    createNote: mockCreateNote,
    deleteNote: mockDeleteNote,
    updateNote: mockUpdateNote,
    getNotesForTag: mockGetNotesForTag,
    getTagsForNote: mockGetTagsForNote,
  }),
}));

vi.mock("../../src/components/shared/NoteCard", () => ({
  default: ({ note, onClick }: any) => (
    <div data-testid="note-card" onClick={() => onClick(note)}>
      {note.title}
    </div>
  ),
}));

vi.mock("../../src/components/shared/TagBadge", () => ({
  default: ({ name, onClick }: any) => (
    <button data-testid="tag-filter-btn" onClick={onClick}>
      #{name}
    </button>
  ),
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
    createNote: vi.fn().mockResolvedValue({}),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    updateNote: vi.fn().mockResolvedValue({}),
    getNotesForTag: vi.fn().mockResolvedValue([]),
    getTagsForNote: vi.fn().mockResolvedValue([]),
  })),
  initStorage: vi.fn(),
  closeStorage: vi.fn(),
}));

vi.mock("../../src/components/shared/DeleteNoteDialog", () => ({
  default: () => null,
}));

vi.mock("../../src/components/shared/MoveNoteDialog", () => ({
  default: () => null,
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: any) => ({
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 20) }, (_, i) => ({
        index: i,
        key: `virtual-${i}`,
        start: i * 50,
        size: 50,
      })),
    getTotalSize: () => count * 50,
    measureElement: vi.fn(),
  }),
}));

vi.mock("../../src/components/mobile/MobileDrawer", () => ({
  default: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="mobile-drawer">
        <button onClick={() => onOpenChange?.(false)}>✕</button>
      </div>
    ) : null,
}));

import NoteListMobile from "../../src/components/mobile/NoteListMobile";

describe("NoteListMobile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotes = [
      {
        id: "n1",
        title: "Note 1",
        contentJson: "",
        mdText: "",
        folderId: null,
        type: "rich",
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null,
        version: 1,
      },
    ];
    mockTags = [
      { id: "t1", name: "work" },
      { id: "t2", name: "personal" },
    ];
    mockFolders = [];
    mockListNotes.mockResolvedValue(mockNotes);
    mockListFolders.mockResolvedValue([]);
    mockCreateNote.mockResolvedValue(mockNotes[0]);
    mockUpdateNote.mockResolvedValue(mockNotes[0]);
  });

  it("renders header with 全部笔记", () => {
    render(<NoteListMobile />);
    expect(screen.getByText("← 全部笔记")).toBeTruthy();
  });

  it("renders note cards for active notes", () => {
    render(<NoteListMobile />);
    const cards = screen.getAllByTestId("note-card");
    expect(cards.length).toBe(2);
    expect(cards.some((c) => c.textContent?.includes("Note 1"))).toBe(true);
    expect(cards.some((c) => c.textContent?.includes("Note 2"))).toBe(true);
  });

  it("renders tag filter buttons at top", () => {
    render(<NoteListMobile />);
    const tagButtons = screen.getAllByTestId("tag-filter-btn");
    expect(tagButtons.length).toBe(2);
    expect(tagButtons.some((b) => b.textContent?.includes("work"))).toBe(true);
  });

  it("renders folder filter entry button", () => {
    render(<NoteListMobile />);
    expect(screen.getByText("📁 文件夹")).toBeTruthy();
  });

  it("shows MobileDrawer when folder button is clicked", async () => {
    const user = userEvent.setup();
    render(<NoteListMobile />);
    expect(screen.queryByTestId("mobile-drawer")).toBeNull();
    await user.click(screen.getByText("📁 文件夹"));
    expect(screen.getByTestId("mobile-drawer")).toBeTruthy();
  });

  it("uses virtual scrolling for note list rendering", () => {
    mockNotes = Array.from({ length: 50 }, (_, i) => ({
      id: `n${i}`,
      title: `Note ${i}`,
      contentJson: "",
      mdText: "",
      folderId: null,
      type: "rich",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      version: 1,
    }));
    render(<NoteListMobile />);
    const cards = screen.getAllByTestId("note-card");
    expect(cards.length).toBeLessThanOrEqual(20);
  });
});
