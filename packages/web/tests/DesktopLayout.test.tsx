import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

afterEach(cleanup);

let mockCurrentNote: any = null;

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
    const state = { folders: [], setFolders: vi.fn() };
    return selector ? selector(state) : state;
  },
  useUIStore: (selector?: any) => {
    const state = { editorMode: "wysiwyg", isMobile: false, setIsMobile: vi.fn(), setEditorMode: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock("../src/hooks", () => ({
  useStorage: () => ({
    listNotes: vi.fn().mockResolvedValue([]),
    listFolders: vi.fn().mockResolvedValue([]),
    updateNote: vi.fn(),
    createNote: vi.fn(),
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

vi.mock("../src/components/shared/EditorToolbar", () => ({
  default: () => <div data-testid="editor-toolbar">Toolbar Mock</div>,
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
  });

  it("renders Sidebar and main content area", () => {
    const { container } = render(<DesktopLayout />);
    expect(screen.getByTestId("sidebar")).toBeTruthy();
    expect(container.querySelector(".flex.h-screen")).toBeTruthy();
  });

  it("shows 全部笔记 in sidebar", () => {
    render(<DesktopLayout />);
    expect(screen.getByTestId("sidebar").textContent).toContain("全部笔记");
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
    expect(container.textContent).toContain("Selected Note");
  });
});