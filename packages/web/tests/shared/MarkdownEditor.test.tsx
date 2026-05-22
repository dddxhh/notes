import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import MarkdownEditor from "../../src/components/shared/MarkdownEditor";

describe("MarkdownEditor", () => {
  const onUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith("hello");
    }, { timeout: 2000 });
  });

  it("displays value prop in textarea", () => {
    render(<MarkdownEditor content="initial content" onUpdate={onUpdate} />);
    const textarea = screen.getByDisplayValue("initial content");
    expect(textarea).toBeTruthy();
  });
});