import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockCreateNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockListNotes = vi.fn();
const mockAddNote = vi.fn();
const mockSetCurrentNote = vi.fn();
const mockSetNotes = vi.fn();
const mockListTags = vi.fn();

let mockTags: { id: string; name: string }[] = [];

const mockNotesState = {
  notes: [],
  currentNote: null,
  setNotes: mockSetNotes,
  addNote: mockAddNote,
  setCurrentNote: mockSetCurrentNote,
};

const mockSetTags = vi.fn();

vi.mock("../src/stores", () => ({
  useNotesStore: (selector?: any) => (selector ? selector(mockNotesState) : mockNotesState),
  useUIStore: (selector?: any) =>
    selector
      ? selector({ isMobile: false, setIsMobile: vi.fn() })
      : { isMobile: false, setIsMobile: vi.fn() },
  useTagsStore: (selector?: any) =>
    selector
      ? selector({
          tags: mockTags,
          setTags: mockSetTags,
          addTag: vi.fn(),
          removeTag: vi.fn(),
          loading: false,
          setLoading: vi.fn(),
        })
      : { tags: mockTags },
}));

vi.mock("../src/hooks", () => ({
  useStorage: () => ({
    createNote: mockCreateNote,
    updateNote: mockUpdateNote,
    listNotes: mockListNotes,
    listTags: mockListTags,
  }),
}));

vi.mock("../src/lib/markdown-serializer", () => ({
  extractTitleFromContent: vi.fn((text: string) => text.slice(0, 20)),
}));

vi.mock("../src/components/shared/NoteCard", () => ({
  default: ({ note, onClick, tags }: any) => (
    <div data-testid="note-card" onClick={() => onClick(note)}>
      {note.title}
      {tags?.map((t: any) => (
        <span key={t.id} data-testid="note-card-tag">
          #{t.name}
        </span>
      ))}
    </div>
  ),
}));

vi.mock("../src/components/shared/TagBadge", () => ({
  default: ({ name, onClick }: any) => (
    <button data-testid="tag-filter-btn" onClick={onClick}>
      #{name}
    </button>
  ),
}));

vi.mock("../src/components/shared/SearchBar", () => ({
  default: ({ onQueryChange }: any) => (
    <button data-testid="search-entry-btn" onClick={() => onQueryChange("test")}>
      搜索
    </button>
  ),
}));

import QuickNote from "../src/components/QuickNote";

describe("QuickNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNote.mockResolvedValue({
      id: "new-note-1",
      title: "test",
      mdText: "test",
      contentJson: "",
      folderId: null,
      type: "rich",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      version: 1,
    });
    mockListNotes.mockResolvedValue([]);
    mockTags = [];
    mockListTags.mockResolvedValue([]);
  });

  it("renders textarea with placeholder 想写点什么？", () => {
    render(<QuickNote />);
    expect(screen.getByPlaceholderText("想写点什么？")).toBeTruthy();
  });

  it("creates a note when typing content", async () => {
    const user = userEvent.setup();
    render(<QuickNote />);
    const textarea = screen.getByPlaceholderText("想写点什么？");
    await user.type(textarea, "hello world");
    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled();
    });
  });

  it("updates existing note on subsequent edits (debounced)", async () => {
    const user = userEvent.setup();
    render(<QuickNote />);
    const textarea = screen.getByPlaceholderText("想写点什么？");
    await user.type(textarea, "hello world");

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalled();
    });

    await user.type(textarea, " more");
    await waitFor(
      () => {
        expect(mockUpdateNote).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it("renders tag filter buttons below recent notes", () => {
    mockTags = [
      { id: "tag-1", name: "work" },
      { id: "tag-2", name: "ideas" },
    ];
    render(<QuickNote />);
    const tagButtons = screen.getAllByTestId("tag-filter-btn");
    expect(tagButtons.length).toBe(2);
    expect(tagButtons.some((b) => b.textContent?.includes("work"))).toBe(true);
  });

  it("renders search entry button", () => {
    render(<QuickNote />);
    expect(screen.getByTestId("search-toggle")).toBeTruthy();
  });

  it("renders NoteCard with tag badges when tags are provided", () => {
    mockNotesState.notes = [
      {
        id: "n1",
        title: "My Note",
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
    render(<QuickNote />);
    const noteCards = screen.getAllByTestId("note-card");
    expect(noteCards.length).toBeGreaterThanOrEqual(1);
  });
});
