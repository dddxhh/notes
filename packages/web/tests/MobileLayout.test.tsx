import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

let mockCurrentNote: any = null;
const mockSetCurrentNote = vi.fn();

vi.mock("../src/stores", () => ({
  useNotesStore: (selector?: any) => {
    const state = {
      notes: [],
      currentNote: mockCurrentNote,
      setCurrentNote: mockSetCurrentNote,
      setNotes: vi.fn(),
      addNote: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useUIStore: (selector?: any) => {
    const state = { editorMode: "wysiwyg", isMobile: true, setIsMobile: vi.fn(), setEditorMode: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock("../src/hooks", () => ({
  useStorage: () => ({
    listNotes: vi.fn().mockResolvedValue([]),
    updateNote: vi.fn(),
    createNote: vi.fn(),
  }),
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

vi.mock("../src/components/shared/EditorToolbar", () => ({
  default: () => <div data-testid="editor-toolbar">Toolbar Mock</div>,
}));

vi.mock("../src/components/QuickNote", () => ({
  default: () => <div data-testid="quick-note">QuickNote Mock</div>,
}));

vi.mock("../src/components/mobile/NoteListMobile", () => ({
  default: () => <div data-testid="note-list-mobile">NoteList Mock</div>,
}));

import MobileLayout from "../src/components/layouts/MobileLayout";

describe("MobileLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentNote = null;
  });

  it("renders tab navigation with 快速笔记 and 全部笔记", () => {
    const { container } = render(<MobileLayout />);
    const buttons = Array.from(container.querySelectorAll("button"));
    const texts = buttons.map((b) => b.textContent);
    expect(texts).toContain("📝 快速笔记");
    expect(texts).toContain("📋 全部笔记");
  });

  it("shows QuickNote by default", () => {
    render(<MobileLayout />);
    expect(screen.getByTestId("quick-note")).toBeTruthy();
  });

  it("shows NoteListMobile when clicking 全部笔记 tab", async () => {
    const user = userEvent.setup();
    const { container } = render(<MobileLayout />);
    const allNotesButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("全部笔记")
    );
    expect(allNotesButton).toBeTruthy();
    await user.click(allNotesButton!);
    expect(screen.getByTestId("note-list-mobile")).toBeTruthy();
  });

  it("shows NoteView when currentNote is set", () => {
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
    expect(container.textContent).toContain("Active Note");
  });
});