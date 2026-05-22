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

const mockNotesState = {
  notes: [],
  currentNote: null,
  setNotes: mockSetNotes,
  addNote: mockAddNote,
  setCurrentNote: mockSetCurrentNote,
};

vi.mock("../src/stores", () => ({
  useNotesStore: (selector?: any) => selector ? selector(mockNotesState) : mockNotesState,
  useUIStore: (selector?: any) => selector ? selector({ isMobile: false, setIsMobile: vi.fn() }) : { isMobile: false, setIsMobile: vi.fn() },
}));

vi.mock("../src/hooks", () => ({
  useStorage: () => ({
    createNote: mockCreateNote,
    updateNote: mockUpdateNote,
    listNotes: mockListNotes,
  }),
}));

vi.mock("../src/lib/markdown-serializer", () => ({
  extractTitleFromContent: vi.fn((text: string) => text.slice(0, 20)),
}));

vi.mock("../src/components/shared/NoteCard", () => ({
  default: ({ note, onClick }: any) => (
    <div data-testid="note-card" onClick={() => onClick(note)}>{note.title}</div>
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
    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});