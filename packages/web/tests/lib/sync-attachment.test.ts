import { describe, it, expect, vi, beforeEach } from "vitest";
import { upload, download } from "../../src/lib/sync-attachment";
import { SyncClient } from "../../src/lib/sync-client";

vi.mock("../../src/lib/sqlite-init", () => ({
  getStorage: () => ({
    getNote: vi.fn().mockResolvedValue(null),
  }),
}));

describe("sync-attachment", () => {
  let mockClient: SyncClient;

  beforeEach(() => {
    mockClient = {
      uploadAttachment: vi.fn().mockResolvedValue({ id: "att-1" }),
      downloadAttachment: vi.fn().mockResolvedValue(new Blob(["test"])),
    } as any;
  });

  it("should upload attachment to server", async () => {
    const att = {
      id: "att-1",
      noteId: "note-1",
      type: "image" as const,
      filename: "test.png",
      mimeType: "image/png",
      size: 100,
      createdAt: 1000,
    };
    const file = new File(["test"], "test.png", { type: "image/png" });

    await upload(mockClient, att, file);

    expect(mockClient.uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "att-1" }),
      file,
    );
  });

  it("should download attachment from server", async () => {
    const blob = await download(mockClient, "att-1");

    expect(mockClient.downloadAttachment).toHaveBeenCalledWith("att-1");
    expect(blob).toBeInstanceOf(Blob);
  });
});
