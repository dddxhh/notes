import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Attachment } from "@notes/core";

const mockAttachment: Attachment = {
  id: "att-1",
  noteId: "note-1",
  type: "image",
  filename: "photo.jpg",
  mimeType: "image/jpeg",
  size: 1024,
  createdAt: 1000,
};

const addAttachmentMock = vi.fn();

vi.mock("../../src/lib/sqlite-init", () => ({
  getStorage: vi.fn(),
}));

vi.mock("../../src/stores", () => ({
  useAttachmentsStore: (selector: any) => selector({ addAttachment: addAttachmentMock }),
}));

vi.mock("@notes/core", () => ({
  validateFile: vi.fn(),
  compressImage: vi.fn(),
}));

import { useAttachmentUpload } from "../../src/hooks/useAttachmentUpload";
import { getStorage } from "../../src/lib/sqlite-init";
import { validateFile, compressImage } from "@notes/core";

describe("useAttachmentUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addAttachmentMock.mockReset();
  });

  it("returns validation failure when file is invalid", async () => {
    const file = new File(["data"], "bad.exe", { type: "application/x-executable" });
    (validateFile as any).mockReturnValue({ valid: false, error: "Unsupported file type", type: null, needsCompress: false });

    const { result } = renderHook(() => useAttachmentUpload("note-1"));
    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file);
    });
    expect(uploadResult.success).toBe(false);
    expect(uploadResult.error).toBe("Unsupported file type");
    expect(addAttachmentMock).not.toHaveBeenCalled();
  });

  it("compresses and uploads large image file", async () => {
    const file = new File(["big-image-data"], "photo.jpg", { type: "image/jpeg" });
    const compressedFile = new File(["compressed"], "photo.webp", { type: "image/webp" });
    (validateFile as any).mockReturnValue({ valid: true, type: "image", needsCompress: true });
    (compressImage as any).mockResolvedValue(compressedFile);
    (getStorage as any).mockReturnValue({
      saveAttachment: vi.fn().mockResolvedValue(mockAttachment),
    });

    const { result } = renderHook(() => useAttachmentUpload("note-1"));
    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file);
    });
    expect(uploadResult.success).toBe(true);
    expect(uploadResult.attachment).toEqual(mockAttachment);
    expect(compressImage).toHaveBeenCalledWith(file);
    expect(addAttachmentMock).toHaveBeenCalledWith(mockAttachment);
  });

  it("uploads small file directly without compression", async () => {
    const file = new File(["small-image"], "sm.png", { type: "image/png" });
    (validateFile as any).mockReturnValue({ valid: true, type: "image", needsCompress: false });
    (getStorage as any).mockReturnValue({
      saveAttachment: vi.fn().mockResolvedValue(mockAttachment),
    });

    const { result } = renderHook(() => useAttachmentUpload("note-1"));
    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file);
    });
    expect(uploadResult.success).toBe(true);
    expect(uploadResult.attachment).toEqual(mockAttachment);
    expect(compressImage).not.toHaveBeenCalled();
    expect(addAttachmentMock).toHaveBeenCalledWith(mockAttachment);
  });

  it("uploads original file when compression fails", async () => {
    const file = new File(["big-image-data"], "photo.jpg", { type: "image/jpeg" });
    (validateFile as any).mockReturnValue({ valid: true, type: "image", needsCompress: true });
    (compressImage as any).mockRejectedValue(new Error("OffscreenCanvas not available"));
    (getStorage as any).mockReturnValue({
      saveAttachment: vi.fn().mockResolvedValue(mockAttachment),
    });

    const { result } = renderHook(() => useAttachmentUpload("note-1"));
    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file);
    });
    expect(uploadResult.success).toBe(true);
    expect(uploadResult.attachment).toEqual(mockAttachment);
    expect(getStorage().saveAttachment).toHaveBeenCalledWith("note-1", file, "image");
  });

  it("returns error when storage saveAttachment fails", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    (validateFile as any).mockReturnValue({ valid: true, type: "image", needsCompress: false });
    (getStorage as any).mockReturnValue({
      saveAttachment: vi.fn().mockRejectedValue(new Error("DB error")),
    });

    const { result } = renderHook(() => useAttachmentUpload("note-1"));
    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.uploadFile(file);
    });
    expect(uploadResult.success).toBe(false);
    expect(uploadResult.error).toContain("上传失败");
    expect(addAttachmentMock).not.toHaveBeenCalled();
  });
});