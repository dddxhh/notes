import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach } from "vitest";

afterEach(cleanup);

const mockUploadFile = vi.fn();
const mockSetCustomImage = vi.fn();
const mockSetCustomVideo = vi.fn();

vi.mock("../../src/hooks/useAttachmentUpload", () => ({
  useAttachmentUpload: () => ({ uploadFile: mockUploadFile }),
}));

vi.mock("../../src/lib/attachment-protocol", () => ({
  createAttachmentSrc: (id: string) => `attachment://${id}`,
}));

vi.mock("../../src/components/shared/ImageUploadButton", () => ({
  default: ({ onFileSelected }: any) => (
    <button data-testid="image-upload-btn" onClick={() => onFileSelected(new File([], "test.png", { type: "image/png" }))}>
      ImageUpload
    </button>
  ),
}));

vi.mock("../../src/components/shared/VideoUploadButton", () => ({
  default: ({ onFileSelected }: any) => (
    <button data-testid="video-upload-btn" onClick={() => onFileSelected(new File([], "test.mp4", { type: "video/mp4" }))}>
      VideoUpload
    </button>
  ),
}));

const mockEditor = {
  chain: () => ({ focus: () => ({ run: vi.fn() }) }),
  isActive: () => false,
  commands: { setCustomImage: mockSetCustomImage, setCustomVideo: mockSetCustomVideo },
  storage: { characterCount: { characters: () => 0 } },
} as any;

import EditorToolbar from "../../src/components/shared/EditorToolbar";

describe("EditorToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ImageUploadButton", () => {
    const { getByTestId } = render(<EditorToolbar editor={mockEditor} />);
    expect(getByTestId("image-upload-btn")).toBeDefined();
  });

  it("renders VideoUploadButton", () => {
    const { getByTestId } = render(<EditorToolbar editor={mockEditor} />);
    expect(getByTestId("video-upload-btn")).toBeDefined();
  });

  it("clicking image upload button calls uploadFile then setCustomImage on success", async () => {
    const user = userEvent.setup();
    const attachment = { id: "att1", noteId: "note-1", type: "image", filename: "photo.jpg", mimeType: "image/jpeg", size: 1024, createdAt: 1000 };
    mockUploadFile.mockResolvedValue({ success: true, attachment });
    const { getByTestId } = render(<EditorToolbar editor={mockEditor} />);
    await user.click(getByTestId("image-upload-btn"));
    expect(mockUploadFile).toHaveBeenCalled();
    expect(mockSetCustomImage).toHaveBeenCalledWith({ src: "attachment://att1" });
  });

  it("clicking video upload button calls uploadFile then setCustomVideo on success", async () => {
    const user = userEvent.setup();
    const attachment = { id: "att2", noteId: "note-1", type: "video", filename: "clip.mp4", mimeType: "video/mp4", size: 2048, createdAt: 2000 };
    mockUploadFile.mockResolvedValue({ success: true, attachment });
    const { getByTestId } = render(<EditorToolbar editor={mockEditor} />);
    await user.click(getByTestId("video-upload-btn"));
    expect(mockUploadFile).toHaveBeenCalled();
    expect(mockSetCustomVideo).toHaveBeenCalledWith({ src: "attachment://att2" });
  });

  it("does not call setCustomImage when upload fails", async () => {
    const user = userEvent.setup();
    mockUploadFile.mockResolvedValue({ success: false, error: "Upload failed" });
    const { getByTestId } = render(<EditorToolbar editor={mockEditor} />);
    await user.click(getByTestId("image-upload-btn"));
    expect(mockUploadFile).toHaveBeenCalled();
    expect(mockSetCustomImage).not.toHaveBeenCalled();
  });
});