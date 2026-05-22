import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

afterEach(cleanup);

const mockSetPendingUpload = vi.fn();
let mockPendingUpload: string | null = null;
const mockUploadFile = vi.fn();

const { editorConfigCapture } = vi.hoisted(() => ({
  editorConfigCapture: { config: null as any },
}));

vi.mock("../../src/stores", () => ({
  useUIStore: (selector: any) => selector({ editorMode: "wysiwyg", isMobile: false }),
  useSlashCommandStore: (selector: any) =>
    selector({ pendingUpload: mockPendingUpload, setPendingUpload: mockSetPendingUpload }),
  useAttachmentsStore: (selector: any) => selector({ addAttachment: vi.fn() }),
}));

vi.mock("../../src/hooks/useAttachmentUpload", () => ({
  useAttachmentUpload: () => ({ uploadFile: mockUploadFile }),
}));

vi.mock("../../src/lib/attachment-protocol", () => ({
  createAttachmentSrc: (id: string) => `attachment://${id}`,
}));

vi.mock("../../src/lib/tiptap-setup", () => ({
  getEditorExtensions: vi.fn(),
}));

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((config: any) => {
    editorConfigCapture.config = config;
    return null;
  }),
  EditorContent: () => <div data-testid="editor-content">Editor Content Mock</div>,
}));

vi.mock("../../src/lib/markdown-serializer", () => ({
  proseMirrorJSONToMarkdown: vi.fn(() => "mock md"),
}));

import Editor from "../../src/components/shared/Editor";

describe("Editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingUpload = null;
    editorConfigCapture.config = null;
  });

  it("renders nothing when editor is null (TipTap init)", () => {
    const { container } = render(<Editor content="" onUpdate={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("accepts content prop without error", () => {
    const onUpdate = vi.fn();
    render(<Editor content="<p>Hello</p>" onUpdate={onUpdate} />);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("accepts currentNoteId prop for setContent control", () => {
    const onUpdate = vi.fn();
    const { rerender } = render(<Editor content="" currentNoteId="note-1" onUpdate={onUpdate} />);
    rerender(<Editor content="" currentNoteId="note-2" onUpdate={onUpdate} />);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("calls onUpdate only when editor fires update event (TipTap-dependent, mocked)", () => {
    const onUpdate = vi.fn();
    render(<Editor content="" onUpdate={onUpdate} />);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("accepts onFileUpload prop", () => {
    const onFileUpload = vi.fn();
    render(<Editor content="" onUpdate={vi.fn()} onFileUpload={onFileUpload} />);
    expect(onFileUpload).not.toHaveBeenCalled();
  });

  it("accepts currentNoteId and onFileUpload together", () => {
    const onFileUpload = vi.fn();
    render(
      <Editor content="" currentNoteId="note-1" onUpdate={vi.fn()} onFileUpload={onFileUpload} />,
    );
    expect(onFileUpload).not.toHaveBeenCalled();
  });
});

describe("Editor drag/paste upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPendingUpload = null;
    editorConfigCapture.config = null;
  });

  it("includes handleDrop in editorProps", () => {
    render(<Editor content="" onUpdate={vi.fn()} />);
    expect(editorConfigCapture.config).toBeTruthy();
    expect(editorConfigCapture.config.editorProps).toBeTruthy();
    expect(typeof editorConfigCapture.config.editorProps.handleDrop).toBe("function");
  });

  it("includes handlePaste in editorProps", () => {
    render(<Editor content="" onUpdate={vi.fn()} />);
    expect(editorConfigCapture.config).toBeTruthy();
    expect(editorConfigCapture.config.editorProps).toBeTruthy();
    expect(typeof editorConfigCapture.config.editorProps.handlePaste).toBe("function");
  });

  it("handleDrop calls onFileUpload for dropped files", () => {
    const onFileUpload = vi.fn();
    render(<Editor content="" onUpdate={vi.fn()} onFileUpload={onFileUpload} />);
    const mockFile = new File(["data"], "image.png", { type: "image/png" });
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [mockFile] },
    };
    editorConfigCapture.config.editorProps.handleDrop(null, mockEvent, null, false);
    expect(onFileUpload).toHaveBeenCalledWith(mockFile);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("handlePaste calls onFileUpload for pasted files", () => {
    const onFileUpload = vi.fn();
    render(<Editor content="" onUpdate={vi.fn()} onFileUpload={onFileUpload} />);
    const mockFile = new File(["data"], "image.png", { type: "image/png" });
    const mockEvent = {
      preventDefault: vi.fn(),
      clipboardData: { files: [mockFile] },
    };
    editorConfigCapture.config.editorProps.handlePaste(null, mockEvent, null);
    expect(onFileUpload).toHaveBeenCalledWith(mockFile);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("handleDrop uses uploadFile when no onFileUpload prop", () => {
    mockUploadFile.mockResolvedValue({ success: true, attachment: { id: "att-1", type: "image" } });
    render(<Editor content="" onUpdate={vi.fn()} />);
    const mockFile = new File(["data"], "image.png", { type: "image/png" });
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [mockFile] },
    };
    editorConfigCapture.config.editorProps.handleDrop(null, mockEvent, null, false);
    expect(mockUploadFile).toHaveBeenCalledWith(mockFile);
  });

  it("handlePaste returns false when no files (allows text paste)", () => {
    render(<Editor content="" onUpdate={vi.fn()} />);
    const mockEvent = {
      preventDefault: vi.fn(),
      clipboardData: { files: [] },
    };
    const result = editorConfigCapture.config.editorProps.handlePaste(null, mockEvent, null);
    expect(result).toBe(false);
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("handleDrop returns false when no files (allows default drop)", () => {
    render(<Editor content="" onUpdate={vi.fn()} />);
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [] },
    };
    const result = editorConfigCapture.config.editorProps.handleDrop(null, mockEvent, null, false);
    expect(result).toBe(false);
  });
});
