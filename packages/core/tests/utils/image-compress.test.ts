import { describe, it, expect, vi, beforeEach } from "vitest";
import { compressImage, shouldCompressImage } from "../../src/utils/image-compress";

function createMockFile(name: string, type: string, size: number): File {
  const file = new File([""], name, { type });
  Object.defineProperty(file, "size", { value: size, writable: false });
  return file;
}

describe("shouldCompressImage", () => {
  it("应为大于 5MB 的图片返回 true", () => {
    const file = createMockFile("large.jpg", "image/jpeg", 5 * 1024 * 1024 + 1);
    expect(shouldCompressImage(file)).toBe(true);
  });

  it("应为小于 5MB 的图片返回 false", () => {
    const file = createMockFile("small.jpg", "image/jpeg", 5 * 1024 * 1024 - 1);
    expect(shouldCompressImage(file)).toBe(false);
  });

  it("应为非图片文件返回 false", () => {
    const file = createMockFile("video.mp4", "video/mp4", 5 * 1024 * 1024 + 1);
    expect(shouldCompressImage(file)).toBe(false);
  });
});

describe("compressImage", () => {
  beforeEach(() => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
      width: 3000,
      height: 2000,
      close: vi.fn(),
    }));

    vi.stubGlobal("OffscreenCanvas", vi.fn().mockImplementation((width, height) => ({
      width,
      height,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      },
      ),
      convertToBlob: vi.fn().mockResolvedValue(
        new Blob(["compressed"], { type: "image/webp" }),
      ),
    })));
  });

  it("应压缩大尺寸图片", async () => {
    const file = createMockFile("big.jpg", "image/jpeg", 6 * 1024 * 1024);
    const result = await compressImage(file);
    expect(result).toBeDefined();
    expect(result.type).toBe("image/webp");
  });

  it("应输出 WebP 格式", async () => {
    const file = createMockFile("photo.png", "image/png", 6 * 1024 * 1024);
    const result = await compressImage(file);
    expect(result.type).toBe("image/webp");
    expect(result.name).toMatch(/\.webp$/);
  });

  it("应在不支持 OffscreenCanvas 时抛出错误", async () => {
    vi.stubGlobal("OffscreenCanvas", undefined);
    vi.stubGlobal("createImageBitmap", undefined);
    const file = createMockFile("photo.jpg", "image/jpeg", 6 * 1024 * 1024);
    await expect(compressImage(file)).rejects.toThrow();
  });
});