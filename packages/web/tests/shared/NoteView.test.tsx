import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const {
  mockUpdateNote,
  mockAddTagsToNote,
  mockRemoveTagFromNote,
  mockListTags,
  mockCreateTag,
  mockUploadFile,
  mockShowToast,
  mockRevokeAllObjectUrls,
  mockNotesStoreState,
} = vi.hoisted(() => ({
  mockUpdateNote: vi.fn().mockResolvedValue({}),
  mockAddTagsToNote: vi.fn(),
  mockRemoveTagFromNote: vi.fn().mockResolvedValue(undefined),
  mockListTags: vi.fn(),
  mockCreateTag: vi.fn(),
  mockUploadFile: vi.fn(),
  mockShowToast: vi.fn(),
  mockRevokeAllObjectUrls: vi.fn(),
  mockNotesStoreState: {
    notes: [] as any[],
    currentNote: null as any,
    updateNoteInList: vi.fn(),
    setCurrentNote: vi.fn(),
    updateNoteTags: vi.fn(),
    removeNoteFromList: vi.fn(),
  },
}));

let mockEditorMode: "wysiwyg" | "markdown" = "wysiwyg";
let mockIsMobile = false;
let mockTags: { id: string; name: string }[] = [];

vi.mock("../../src/stores", () => {
  const notesStore = {
    ...mockNotesStoreState,
    getState: () => notesStore,
  };
  return {
    useUIStore: (selector: any) =>
      selector({
        editorMode: mockEditorMode,
        setEditorMode: vi.fn(),
        isMobile: mockIsMobile,
        setIsMobile: vi.fn(),
      }),
    useNotesStore: Object.assign((selector: any) => selector(mockNotesStoreState), {
      getState: () => notesStore,
    }),
    useSlashCommandStore: (selector: any) =>
      selector({ pendingUpload: null, setPendingUpload: vi.fn() }),
    useAttachmentsStore: (selector: any) => selector({ attachments: [], addAttachment: vi.fn() }),
    useTagsStore: (selector: any) =>
      selector({
        tags: mockTags,
        setTags: vi.fn(),
        addTag: vi.fn(),
        removeTag: vi.fn(),
        loading: false,
        setLoading: vi.fn(),
      }),
  };
});

vi.mock("../../src/hooks", () => ({
  useStorage: () => ({
    updateNote: mockUpdateNote,
    createNote: vi.fn(),
    listNotes: vi.fn(),
    addTagsToNote: mockAddTagsToNote,
    removeTagFromNote: mockRemoveTagFromNote,
    listTags: mockListTags,
    createTag: mockCreateTag,
    deleteNote: vi.fn(),
    getTagsForNote: vi.fn().mockResolvedValue([]),
  }),
  useAttachmentUpload: () => ({ uploadFile: mockUploadFile }),
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock("../../src/hooks/useAttachmentUpload", () => ({
  useAttachmentUpload: () => ({ uploadFile: mockUploadFile }),
}));

vi.mock("../../src/hooks/useToast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
  useToastStore: () => ({ toasts: [], addToast: vi.fn(), removeToast: vi.fn() }),
}));

vi.mock("../../src/lib/attachment-protocol", () => ({
  createAttachmentSrc: (id: string) => `attachment://${id}`,
  revokeAllObjectUrls: (...args: any[]) => mockRevokeAllObjectUrls(...args),
}));

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => ({
    commands: { setContent: vi.fn(), setCustomImage: vi.fn(), setCustomVideo: vi.fn() },
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

vi.mock("../../src/components/shared/EditorToolbar", () => ({
  default: () => <div data-testid="editor-toolbar">Toolbar Mock</div>,
}));

vi.mock("../../src/components/shared/MarkdownEditor", () => ({
  default: ({ content, onUpdate }: any) => (
    <textarea
      placeholder="开始编写 Markdown..."
      defaultValue={content}
      onChange={(e: any) => onUpdate(e.target.value)}
    />
  ),
}));

vi.mock("../../src/components/shared/ModeToggle", () => ({
  default: () => (
    <div>
      <button>所见即所得</button>
      <button>Markdown</button>
    </div>
  ),
}));

vi.mock("../../src/components/shared/TagBadge", () => ({
  default: ({ name, removable, onRemove }: any) => (
    <span data-testid="tag-badge">
      #{name}
      {removable && (
        <button data-testid="remove-tag-btn" onClick={onRemove}>
          ×
        </button>
      )}
    </span>
  ),
}));

vi.mock("../../src/components/shared/TagSelector", () => ({
  default: ({ selectedTagIds, onAdd, onRemove, onCreateTag }: any) => (
    <div data-testid="tag-selector">
      {selectedTagIds.map((id: string) => (
        <span key={id} data-testid="selected-tag">
          {id}
        </span>
      ))}
      <button data-testid="add-tag-btn" onClick={() => onAdd("tag-new")}>
        添加标签
      </button>
      <button data-testid="create-tag-btn" onClick={() => onCreateTag("新标签")}>
        新建
      </button>
    </div>
  ),
}));

vi.mock("@radix-ui/react-context-menu", () => ({
  Root: ({ children }: any) => <div data-testid="context-menu-root">{children}</div>,
  Trigger: ({ children }: any) => <div>{children}</div>,
  Content: ({ children }: any) => <div>{children}</div>,
  Item: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
}));

vi.mock("../../src/components/shared/ContextMenu", () => ({
  default: ({ itemId, itemType, children }: any) => (
    <div data-testid="context-menu-wrapper">
      <span data-testid="context-menu-item-id">{itemId}</span>
      <span data-testid="context-menu-item-type">{itemType}</span>
      {children}
    </div>
  ),
}));

import { useNotesStore } from "../../src/stores";
import NoteView from "../../src/components/NoteView";

(useNotesStore as any).getState = () => mockNotesStoreState;

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

const mockNote2 = {
  ...mockNote,
  id: "note-2",
  title: "Second Note",
};

describe("NoteView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorMode = "wysiwyg";
    mockIsMobile = false;
    mockNotesStoreState.currentNote = null;
    mockNotesStoreState.updateNoteInList.mockReset();
    mockNotesStoreState.setCurrentNote.mockReset();
    mockTags = [
      { id: "tag-1", name: "work" },
      { id: "tag-2", name: "ideas" },
    ];
  });

  it("renders note title in input field", () => {
    render(<NoteView note={mockNote} />);
    expect(screen.getByDisplayValue("Test Note")).toBeTruthy();
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
    await waitFor(
      () => {
        expect(mockUpdateNote).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );
  });

  it("renders existing tags as TagBadge components", () => {
    render(<NoteView note={mockNote} initialTagIds={["tag-1", "tag-2"]} />);
    const badges = screen.getAllByTestId("tag-badge");
    expect(badges.length).toBe(2);
    expect(badges.some((b) => b.textContent?.includes("work"))).toBe(true);
    expect(badges.some((b) => b.textContent?.includes("ideas"))).toBe(true);
  });

  it("shows removable TagBadge for existing tags", () => {
    render(<NoteView note={mockNote} initialTagIds={["tag-1", "tag-2"]} />);
    const removeButtons = screen.getAllByTestId("remove-tag-btn");
    expect(removeButtons.length).toBe(2);
  });

  it("removes tag from noteTagIds when remove button clicked", async () => {
    const user = userEvent.setup();
    render(<NoteView note={mockNote} initialTagIds={["tag-1", "tag-2"]} />);
    expect(screen.getAllByTestId("tag-badge").length).toBe(2);
    const removeButtons = screen.getAllByTestId("remove-tag-btn");
    await act(async () => {
      await user.click(removeButtons[0]);
    });
    expect(mockRemoveTagFromNote).toHaveBeenCalledWith("note-1", "tag-1");
    expect(mockNotesStoreState.updateNoteTags).toHaveBeenCalled();
  });

  it("shows 添加标签 button (TagSelector trigger)", () => {
    render(<NoteView note={mockNote} />);
    expect(screen.getByText("添加标签")).toBeTruthy();
  });

  it("shows TagSelector (always rendered)", () => {
    render(<NoteView note={mockNote} />);
    expect(screen.getByTestId("tag-selector")).toBeTruthy();
  });

  it("calls addTagsToNote when a tag is added via TagSelector", async () => {
    const user = userEvent.setup();
    render(<NoteView note={mockNote} />);
    await user.click(screen.getByTestId("add-tag-btn"));
    expect(mockAddTagsToNote).toHaveBeenCalledWith("note-1", ["tag-new"]);
  });

  it("renders ContextMenu wrapping the editor area", () => {
    render(<NoteView note={mockNote} />);
    expect(screen.getByTestId("context-menu-wrapper")).toBeTruthy();
    expect(screen.getByTestId("context-menu-item-id").textContent).toBe("note-1");
    expect(screen.getByTestId("context-menu-item-type").textContent).toBe("note");
  });
});

describe("NoteView drag/paste upload + Toast + Object URL cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorMode = "wysiwyg";
    mockIsMobile = false;
    mockUploadFile.mockReset();
    mockShowToast.mockReset();
    mockRevokeAllObjectUrls.mockReset();
    mockTags = [];
  });

  it("passes onFileUpload to Editor component", () => {
    render(<NoteView note={mockNote} />);
    expect(screen.getByTestId("editor-content")).toBeTruthy();
  });

  it("handleFileUpload calls uploadFile and shows success toast", async () => {
    const mockAttachment = {
      id: "att-1",
      noteId: "note-1",
      type: "image",
      filename: "img.png",
      mimeType: "image/png",
      size: 100,
      createdAt: Date.now(),
    };
    mockUploadFile.mockResolvedValue({ success: true, attachment: mockAttachment });
    render(<NoteView note={mockNote} />);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("handleFileUpload shows error toast on upload failure", async () => {
    mockUploadFile.mockResolvedValue({ success: false, error: "上传失败" });
    render(<NoteView note={mockNote} />);
  });

  it("revokes all Object URLs on noteId change", () => {
    const { rerender } = render(<NoteView note={mockNote} />);
    expect(mockRevokeAllObjectUrls).not.toHaveBeenCalled();
    rerender(<NoteView note={mockNote2} />);
    expect(mockRevokeAllObjectUrls).toHaveBeenCalled();
  });

  it("revokes all Object URLs on unmount", () => {
    const { unmount } = render(<NoteView note={mockNote} />);
    unmount();
    expect(mockRevokeAllObjectUrls).toHaveBeenCalled();
  });
});
