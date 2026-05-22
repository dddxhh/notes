import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockSanitizeHtml = vi.fn((html: string) => html);

vi.mock("../../src/lib/dompurify-setup", () => ({
  sanitizeHtml: (...args: any[]) => mockSanitizeHtml(...args),
}));

import MarkdownEditor from "../../src/components/shared/MarkdownEditor";

describe("MarkdownEditor", () => {
  const onUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSanitizeHtml.mockImplementation((html: string) => html);
  });

  it("renders textarea with placeholder", () => {
    render(<MarkdownEditor content="" onUpdate={onUpdate} />);
    const textarea = screen.getByPlaceholderText("开始编写 Markdown...");
    expect(textarea).toBeTruthy();
  });

  it("calls onUpdate when textarea value changes (debounced 500ms)", async () => {
    const user = userEvent.setup();
    render(<MarkdownEditor content="" onUpdate={onUpdate} />);
    const textarea = screen.getByPlaceholderText("开始编写 Markdown...");
    await user.type(textarea, "hello");
    await waitFor(
      () => {
        expect(onUpdate).toHaveBeenCalledWith("hello");
      },
      { timeout: 2000 },
    );
  });

  it("displays value prop in textarea", () => {
    render(<MarkdownEditor content="initial content" onUpdate={onUpdate} />);
    const textarea = screen.getByDisplayValue("initial content");
    expect(textarea).toBeTruthy();
  });

  describe("source mode rendering", () => {
    it("renders TaskList items with - [x] / - [ ] checkboxes", () => {
      const content = "- [x] completed task\n- [ ] pending task";
      render(<MarkdownEditor content={content} onUpdate={onUpdate} />);
      const textarea = screen.getByPlaceholderText("开始编写 Markdown...") as HTMLTextAreaElement;
      expect(textarea.value).toContain("- [x]");
      expect(textarea.value).toContain("- [ ]");
    });

    it("renders Table pipe format correctly", () => {
      const content = "| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |";
      render(<MarkdownEditor content={content} onUpdate={onUpdate} />);
      const textarea = screen.getByPlaceholderText("开始编写 Markdown...") as HTMLTextAreaElement;
      expect(textarea.value).toContain("| Header 1 | Header 2 |");
      expect(textarea.value).toContain("| --- | --- |");
    });

    it("renders CodeBlock with ```lang format", () => {
      const content = "```javascript\nconsole.log('hello');\n```";
      render(<MarkdownEditor content={content} onUpdate={onUpdate} />);
      const textarea = screen.getByPlaceholderText("开始编写 Markdown...") as HTMLTextAreaElement;
      expect(textarea.value).toContain("```javascript");
      expect(textarea.value).toContain("console.log('hello');");
    });
  });

  describe("preview mode with DOMPurify", () => {
    it("passes rendered HTML through sanitizeHtml when preview is active", () => {
      render(<MarkdownEditor content="# Hello World" onUpdate={onUpdate} preview />);
      expect(mockSanitizeHtml).toHaveBeenCalled();
      const lastHtml = mockSanitizeHtml.mock.calls[mockSanitizeHtml.mock.calls.length - 1][0];
      expect(lastHtml).toContain("Hello World");
    });

    it("sanitizes preview HTML output", () => {
      render(<MarkdownEditor content="**bold text**" onUpdate={onUpdate} preview />);
      expect(mockSanitizeHtml).toHaveBeenCalled();
      const lastHtml = mockSanitizeHtml.mock.calls[mockSanitizeHtml.mock.calls.length - 1][0];
      expect(typeof lastHtml).toBe("string");
      expect(lastHtml).toContain("bold text");
    });

    it("toggles between source and preview mode", async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor content="" onUpdate={onUpdate} />);
      expect(screen.getByPlaceholderText("开始编写 Markdown...")).toBeTruthy();
      const previewBtn = screen.getByText("预览");
      await user.click(previewBtn);
      expect(screen.queryByPlaceholderText("开始编写 Markdown...")).toBeNull();
      const sourceBtn = screen.getByText("源码");
      await user.click(sourceBtn);
      expect(screen.getByPlaceholderText("开始编写 Markdown...")).toBeTruthy();
    });
  });
});
