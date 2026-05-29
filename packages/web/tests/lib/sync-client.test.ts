import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncClient, MetadataSyncResponse, MetadataBatch } from "../../src/lib/sync-client";

describe("SyncClient", () => {
  let client: SyncClient;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockGetToken: ReturnType<typeof vi.fn>;
  let mockOnTokenExpired: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockGetToken = vi.fn().mockReturnValue("test-token");
    mockOnTokenExpired = vi.fn().mockResolvedValue(true);
    global.fetch = mockFetch;

    client = new SyncClient({
      serverUrl: "http://localhost:3001",
      getToken: mockGetToken,
      onTokenExpired: mockOnTokenExpired,
    });
  });

  it("should pull metadata with auth header", async () => {
    const mockResponse: MetadataSyncResponse = {
      notes: [],
      folders: [],
      tags: [],
      noteTags: [],
      attachments: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await client.pullMetadata();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/metadata/sync",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("should push metadata batch", async () => {
    const batch: MetadataBatch = {
      notes: [
        {
          id: "note-1",
          title: "Test",
          folderId: null,
          type: "rich",
          createdAt: 1000,
          updatedAt: 1000,
          deletedAt: null,
          version: 1,
          isOwner: true,
          sharePermission: null,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await client.pushMetadata(batch);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/metadata/batch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(batch),
      }),
    );
  });

  it("should retry with refreshed token on 401", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 }).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ notes: [], folders: [], tags: [], noteTags: [], attachments: [] }),
    });

    mockGetToken.mockReturnValueOnce("old-token").mockReturnValueOnce("new-token");

    await client.pullMetadata();

    expect(mockOnTokenExpired).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
