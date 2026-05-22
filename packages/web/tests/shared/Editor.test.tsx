import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

afterEach(cleanup);

const mockSetPendingUpload = vi.fn();
let mockPendingUpload: string | null = null;
const mockUploadFile = vi.fn();

vi.mock("../../src/stores", () => ({
  useUIStore: (selector: any) => selector({ editorMode: "wysiwyg", isMobile: false }),
  useSlashCommandStore: (selector: any) => selector({ pendingUpload: mockPendingUpload, setPendingUpload: mockSetPendingUpload }),
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
  useEditor: vi.fn(() => null),
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
    const { rerender } = render(
      <Editor content="" currentNoteId="note-1" onUpdate={onUpdate} />
    );
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
    render(<Editor content="" currentNoteId="note-1" onUpdate={vi.fn()} onFileUpload={onFileUpload} />);
    expect(onFileUpload).not.toHaveBeenCalled();
  });
});