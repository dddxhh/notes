import { describe, it, expect } from "vitest";
import { validateFile, detectAttachmentType } from "../../src/utils/file-validation";
import type { AttachmentType } from "../../src/models/attachment";

function createMockFile(name: string, type: string, size: number): File {
  const file = new File([""], name, { type });
  Object.defineProperty(file, "size", { value: size, writable: false });
  return file;
}

describe("文件验证", () => {
  it("应接受允许的图片 MIME 类型", () => {
    const mimeTypes = [
      { mime: "image/jpeg", expectedType: "image" as AttachmentType },
      { mime: "image/png", expectedType: "image" as AttachmentType },
      { mime: "image/gif", expectedType: "image" as AttachmentType },
      { mime: "image/webp", expectedType: "image" as AttachmentType },
      { mime: "image/svg+xml", expectedType: "image" as AttachmentType },
    ];
    for (const { mime, expectedType } of mimeTypes) {
      const file = createMockFile("test", mime, 1024);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.type).toBe(expectedType);
    }
  });

  it("应接受允许的视频 MIME 类型", () => {
    const mimeTypes = [
      { mime: "video/mp4", expectedType: "video" as AttachmentType },
      { mime: "video/webm", expectedType: "video" as AttachmentType },
      { mime: "video/ogg", expectedType: "video" as AttachmentType },
    ];
    for (const { mime, expectedType } of mimeTypes) {
      const file = createMockFile("test", mime, 1024);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.type).toBe(expectedType);
    }
  });

  it("应接受允许的音频 MIME 类型", () => {
    const mimeTypes = [
      { mime: "audio/mpeg", expectedType: "audio" as AttachmentType },
      { mime: "audio/ogg", expectedType: "audio" as AttachmentType },
      { mime: "audio/wav", expectedType: "audio" as AttachmentType },
      { mime: "audio/webm", expectedType: "audio" as AttachmentType },
    ];
    for (const { mime, expectedType } of mimeTypes) {
      const file = createMockFile("test", mime, 1024);
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.type).toBe(expectedType);
    }
  });

  it("应拒绝超过 50MB 的文件", () => {
    const file = createMockFile("big.jpg", "image/jpeg", 50 * 1024 * 1024 + 1);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("应从 MIME 类型检测正确的 AttachmentType", () => {
    expect(detectAttachmentType("image/jpeg")).toBe("image");
    expect(detectAttachmentType("video/mp4")).toBe("video");
    expect(detectAttachmentType("audio/mpeg")).toBe("audio");
    expect(detectAttachmentType("application/pdf")).toBeNull();
  });

  it("应为大于 5MB 的图片设置 needsCompress=true", () => {
    const file = createMockFile("large.png", "image/png", 5 * 1024 * 1024 + 1);
    const result = validateFile(file);
    expect(result.needsCompress).toBe(true);
  });

  it("应为小于 5MB 的图片设置 needsCompress=false", () => {
    const file = createMockFile("small.png", "image/png", 5 * 1024 * 1024 - 1);
    const result = validateFile(file);
    expect(result.needsCompress).toBe(false);
  });

  it("应为非图片文件设置 needsCompress=false", () => {
    const file = createMockFile("test.mp4", "video/mp4", 5 * 1024 * 1024 + 1);
    const result = validateFile(file);
    expect(result.needsCompress).toBe(false);
  });

  it("应拒绝不支持的 MIME 类型", () => {
    const file = createMockFile("test.exe", "application/x-msdownload", 1024);
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.type).toBeNull();
  });
});

describe("detectAttachmentType", () => {
  it("应根据 MIME 前缀返回正确类型", () => {
    expect(detectAttachmentType("image/jpeg")).toBe("image");
    expect(detectAttachmentType("image/png")).toBe("image");
    expect(detectAttachmentType("video/mp4")).toBe("video");
    expect(detectAttachmentType("video/webm")).toBe("video");
    expect(detectAttachmentType("audio/mpeg")).toBe("audio");
    expect(detectAttachmentType("audio/ogg")).toBe("audio");
  });

  it("应对未知 MIME 前缀返回 null", () => {
    expect(detectAttachmentType("application/pdf")).toBeNull();
    expect(detectAttachmentType("text/plain")).toBeNull();
    expect(detectAttachmentType("unknown/unknown")).toBeNull();
  });
});
