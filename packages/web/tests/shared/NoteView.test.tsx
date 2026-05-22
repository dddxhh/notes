import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockUpdateNote = vi.fn();
let mockEditorMode: "wysiwyg" | "markdown" = "wysiwyg";
let mockIsMobile = false;

vi.mock("../../src/stores", () => ({
  useUIStore: (selector: any) =>
    selector({ editorMode: mockEditorMode, setEditorMode: vi.fn(), isMobile: mockIsMobile, setIsMobile: vi.fn() }),
  useNotesStore: () => ({ notes: [], currentNote: null }),
  useSlashCommandStore: (selector: any) =>
    selector({ pendingUpload: null, setPendingUpload: vi.fn() }),
  useAttachmentsStore: (selector: any) =>
    selector({ attachments: [], addAttachment: vi.fn() }),
}));

vi.mock("../../src/hooks", () => ({
  useStorage: () => ({ updateNote: mockUpdateNote, createNote: vi.fn(), listNotes: vi.fn() }),
  useAttachmentUpload: () => ({ uploadFile: vi.fn() }),
}));

vi.mock("../../src/hooks/useAttachmentUpload", () => ({
  useAttachmentUpload: () => ({ uploadFile: vi.fn() }),
}));

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => ({
    commands: { setContent: vi.fn() },
    getJSON: vi.fn(() => ({ type: "doc", content: [] })),
  })),
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock("../../src/lib/tiptap-setup", () => ({
  getEditorExtensions: vi.fn(),
}));

vi.mock("../../src/lib/markdown-serializer", () => ({
  proseMirrorJSONToMarkdown: vi.fn(() => "mock md"),
  markdownToProseMirrorJSON: vi.fn(() => JSON.stringify({ type: "doc", content: [] })),
  extractTitleFromContent: vi.fn(() => "Mock Title"),
}));

vi.mock("../../src/hooks/useAttachmentUpload", () => ({
  useAttachmentUpload: () => ({ uploadFile: vi.fn() }),
}));

vi.mock("../../src/lib/attachment-protocol", () => ({
  createAttachmentSrc: (id: string) => `attachment://${id}`,
}));

vi.mock("../../src/components/shared/EditorToolbar", () => ({
  default: () => <div data-testid="editor-toolbar">Toolbar Mock</div>,
}));

import NoteView from "../../src/components/NoteView";

const mockNote = {
  id: "note-1",
  title: "Test Note",
  contentJson: "",
  mdText: "# Test Note\n\ncontent",
  folderId: null,
  type: "rich",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  deletedAt: null,
  version: 1,
};

describe("NoteView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorMode = "wysiwyg";
    mockIsMobile = false;
  });

  it("renders note title", () => {
    const { container } = render(<NoteView note={mockNote} />);
    expect(container.textContent).toContain("Test Note");
  });

  it("shows ModeToggle", () => {
    const { container } = render(<NoteView note={mockNote} />);
    const buttons = Array.from(container.querySelectorAll("button"));
    const texts = buttons.map((b) => b.textContent);
    expect(texts).toContain("所见即所得");
    expect(texts).toContain("Markdown");
  });

  it("shows Editor in WYSIWYG mode by default", () => {
    mockEditorMode = "wysiwyg";
    render(<NoteView note={mockNote} />);
    expect(screen.getByTestId("editor-content")).toBeTruthy();
    expect(screen.queryByPlaceholderText("开始编写 Markdown...")).toBeNull();
  });

  it("shows MarkdownEditor when toggled to Markdown mode", () => {
    mockEditorMode = "markdown";
    render(<NoteView note={mockNote} />);
    expect(screen.getByPlaceholderText("开始编写 Markdown...")).toBeTruthy();
  });

  it("auto-saves on content change", async () => {
    mockEditorMode = "markdown";
    const user = userEvent.setup();
    const { container } = render(<NoteView note={mockNote} />);
    const textarea = container.querySelector("textarea");
    expect(textarea).toBeTruthy();
    await user.type(textarea!, "extra");
    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalled();
    }, { timeout: 2000 });
  });
});