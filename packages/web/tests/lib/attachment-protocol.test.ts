import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAttachmentSrc,
  isAttachmentSrc,
  parseAttachmentId,
  resolveAttachmentSrc,
  revokeAttachmentObjectUrl,
  revokeAllObjectUrls,
  ATTACHMENT_PROTOCOL,
} from "../../src/lib/attachment-protocol";

const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  mockCreateObjectURL.mockReset();
  mockRevokeObjectURL.mockReset();
  mockCreateObjectURL.mockReturnValue("blob:http://localhost/fake-url");
  revokeAllObjectUrls();
});

vi.stubGlobal("URL", {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

describe("attachment:// 协议", () => {
  describe("createAttachmentSrc", () => {
    it("应返回 attachment:// 前缀的 URL", () => {
      expect(createAttachmentSrc("abc123")).toBe("attachment://abc123");
    });

    it("应保留原始 ID 不做修改", () => {
      expect(createAttachmentSrc("blob-id-with-special_chars-123")).toBe(
        "attachment://blob-id-with-special_chars-123",
      );
    });
  });

  describe("isAttachmentSrc", () => {
    it("应识别 attachment:// URL 为 true", () => {
      expect(isAttachmentSrc("attachment://abc123")).toBe(true);
    });

    it("应识别 https URL 为 false", () => {
      expect(isAttachmentSrc("https://example.com/img.jpg")).toBe(false);
    });

    it("应识别 http URL 为 false", () => {
      expect(isAttachmentSrc("http://example.com/img.jpg")).toBe(false);
    });

    it("应识别普通字符串为 false", () => {
      expect(isAttachmentSrc("just-a-string")).toBe(false);
    });

    it("应识别空字符串为 false", () => {
      expect(isAttachmentSrc("")).toBe(false);
    });
  });

  describe("parseAttachmentId", () => {
    it("应从 attachment:// URL 提取 ID", () => {
      expect(parseAttachmentId("attachment://abc123")).toBe("abc123");
    });

    it("应从非 attachment URL 返回 null", () => {
      expect(parseAttachmentId("https://example.com/img.jpg")).toBe(null);
    });

    it("应从空字符串返回 null", () => {
      expect(parseAttachmentId("")).toBe(null);
    });
  });

  describe("resolveAttachmentSrc", () => {
    const mockBlob = new Blob(["data"], { type: "image/png" });
    const mockGetBlob = vi.fn();

    beforeEach(() => {
      mockGetBlob.mockReset();
    });

    it("应返回 Object URL 当 blob 存在", async () => {
      mockGetBlob.mockResolvedValue(mockBlob);
      const result = await resolveAttachmentSrc("attachment://abc123", mockGetBlob);
      expect(result).toBe("blob:http://localhost/fake-url");
      expect(mockGetBlob).toHaveBeenCalledWith("abc123");
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    });

    it("应返回 null 当 blob 不存在", async () => {
      mockGetBlob.mockResolvedValue(null);
      const result = await resolveAttachmentSrc("attachment://missing", mockGetBlob);
      expect(result).toBe(null);
      expect(mockGetBlob).toHaveBeenCalledWith("missing");
    });

    it("应返回原始 URL 对非 attachment src", async () => {
      const result = await resolveAttachmentSrc("https://example.com/img.jpg", mockGetBlob);
      expect(result).toBe("https://example.com/img.jpg");
      expect(mockGetBlob).not.toHaveBeenCalled();
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it("应缓存 Object URL: 第二次调用不再次调用 getBlob", async () => {
      mockGetBlob.mockResolvedValue(mockBlob);
      const result1 = await resolveAttachmentSrc("attachment://abc123", mockGetBlob);
      const result2 = await resolveAttachmentSrc("attachment://abc123", mockGetBlob);
      expect(result1).toBe(result2);
      expect(mockGetBlob).toHaveBeenCalledTimes(1);
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("revokeAttachmentObjectUrl", () => {
    it("应移除缓存的 Object URL", async () => {
      const mockBlob = new Blob(["data"], { type: "image/png" });
      const mockGetBlob = vi.fn().mockResolvedValue(mockBlob);

      await resolveAttachmentSrc("attachment://abc123", mockGetBlob);
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

      revokeAttachmentObjectUrl("abc123");
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/fake-url");

      await resolveAttachmentSrc("attachment://abc123", mockGetBlob);
      expect(mockGetBlob).toHaveBeenCalledTimes(2);
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    });
  });

  describe("revokeAllObjectUrls", () => {
    it("应清除所有缓存的 Object URLs", async () => {
      const mockBlob1 = new Blob(["data1"], { type: "image/png" });
      const mockBlob2 = new Blob(["data2"], { type: "image/png" });
      const mockGetBlob = vi.fn();

      mockGetBlob.mockResolvedValueOnce(mockBlob1);
      mockGetBlob.mockResolvedValueOnce(mockBlob2);

      mockCreateObjectURL.mockReturnValueOnce("blob:http://localhost/url1");
      mockCreateObjectURL.mockReturnValueOnce("blob:http://localhost/url2");

      await resolveAttachmentSrc("attachment://id1", mockGetBlob);
      await resolveAttachmentSrc("attachment://id2", mockGetBlob);

      revokeAllObjectUrls();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/url1");
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/url2");
    });
  });
});
