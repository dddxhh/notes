import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import VideoUploadButton from "../../src/components/shared/VideoUploadButton";

describe("VideoUploadButton", () => {
  it("renders button with video icon and title", () => {
    const { container } = render(<VideoUploadButton onFileSelected={vi.fn()} />);
    const button = container.querySelector("button")!;
    expect(button.textContent).toContain("🎬");
    expect(button.title).toBe("插入视频");
  });

  it("renders hidden file input with accept video/*", () => {
    const { container } = render(<VideoUploadButton onFileSelected={vi.fn()} />);
    const input = container.querySelector("input")!;
    expect(input.type).toBe("file");
    expect(input.accept).toBe("video/*");
  });

  it("uses toolbar-btn as default className", () => {
    const { container } = render(<VideoUploadButton onFileSelected={vi.fn()} />);
    const button = container.querySelector("button")!;
    expect(button.className).toBe("toolbar-btn");
  });

  it("uses custom className when provided", () => {
    const { container } = render(
      <VideoUploadButton onFileSelected={vi.fn()} className="custom-btn" />,
    );
    const button = container.querySelector("button")!;
    expect(button.className).toBe("custom-btn");
  });

  it("clicking button triggers file input click", async () => {
    const user = userEvent.setup();
    const { container } = render(<VideoUploadButton onFileSelected={vi.fn()} />);
    const input = container.querySelector("input")!;
    const clickSpy = vi.spyOn(input, "click");
    const button = container.querySelector("button")!;
    await user.click(button);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("calls onFileSelected when a file is selected", () => {
    const onFileSelected = vi.fn();
    const { container } = render(<VideoUploadButton onFileSelected={onFileSelected} />);
    const input = container.querySelector("input")!;
    const file = new File(["test"], "test.mp4", { type: "video/mp4" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("does not call onFileSelected when no file is selected", () => {
    const onFileSelected = vi.fn();
    const { container } = render(<VideoUploadButton onFileSelected={onFileSelected} />);
    const input = container.querySelector("input")!;
    Object.defineProperty(input, "files", { value: [], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onFileSelected).not.toHaveBeenCalled();
  });
});
