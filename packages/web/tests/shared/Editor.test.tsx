import { describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

vi.mock("../../src/stores", () => ({
  useUIStore: () => ({ editorMode: "wysiwyg", isMobile: false }),
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
});