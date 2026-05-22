import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockSetEditorMode = vi.fn();
let mockEditorMode: "wysiwyg" | "markdown" = "wysiwyg";

vi.mock("../../src/stores", () => ({
  useUIStore: (selector: any) =>
    selector({ editorMode: mockEditorMode, setEditorMode: mockSetEditorMode }),
}));

import ModeToggle from "../../src/components/shared/ModeToggle";

describe("ModeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorMode = "wysiwyg";
  });

  it("renders both 所见即所得 and Markdown buttons", () => {
    const { container } = render(<ModeToggle />);
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe("所见即所得");
    expect(buttons[1].textContent).toBe("Markdown");
  });

  it("highlights the active mode", () => {
    mockEditorMode = "wysiwyg";
    const { container } = render(<ModeToggle />);
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons[0].className).toContain("bg-blue-500");
    expect(buttons[1].className).toContain("bg-gray-200");
  });

  it("calls setEditorMode when clicking a mode button", async () => {
    const user = userEvent.setup();
    const { container } = render(<ModeToggle />);
    const mdButton = Array.from(container.querySelectorAll("button"))[1];
    await user.click(mdButton);
    expect(mockSetEditorMode).toHaveBeenCalledWith("markdown");
  });
});
