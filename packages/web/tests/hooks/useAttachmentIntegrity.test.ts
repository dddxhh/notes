import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockListAttachmentIds = vi.fn();
const mockGetAttachmentBlob = vi.fn();

vi.mock("../../src/lib/sqlite-init", () => ({
  getStorage: () => ({
    listAttachmentIds: mockListAttachmentIds,
    getAttachmentBlob: mockGetAttachmentBlob,
  }),
}));

import { useAttachmentIntegrity } from "../../src/hooks/useAttachmentIntegrity";

describe("useAttachmentIntegrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state with checked=false and empty missingAttachments", () => {
    mockListAttachmentIds.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAttachmentIntegrity());
    expect(result.current.checked).toBe(false);
    expect(result.current.missingAttachments).toEqual([]);
  });

  it("sets checked=true with empty missingAttachments when all blobs exist", async () => {
    mockListAttachmentIds.mockResolvedValue(["att1", "att2"]);
    mockGetAttachmentBlob.mockResolvedValue(new Blob(["data"]));

    const { result } = renderHook(() => useAttachmentIntegrity());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.missingAttachments).toEqual([]);
  });

  it("detects missing attachments when getAttachmentBlob returns null", async () => {
    mockListAttachmentIds.mockResolvedValue(["att1", "att2", "att3"]);
    mockGetAttachmentBlob
      .mockResolvedValueOnce(new Blob(["data"]))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAttachmentIntegrity());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.missingAttachments).toEqual(["att2", "att3"]);
  });

  it("handles error from listAttachmentIds gracefully", async () => {
    mockListAttachmentIds.mockRejectedValue(new Error("db error"));

    const { result } = renderHook(() => useAttachmentIntegrity());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.missingAttachments).toEqual([]);
  });

  it("handles error from getAttachmentBlob gracefully", async () => {
    mockListAttachmentIds.mockResolvedValue(["att1"]);
    mockGetAttachmentBlob.mockRejectedValue(new Error("idb error"));

    const { result } = renderHook(() => useAttachmentIntegrity());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.missingAttachments).toEqual([]);
  });

  it("returns empty missingAttachments when no attachments exist", async () => {
    mockListAttachmentIds.mockResolvedValue([]);

    const { result } = renderHook(() => useAttachmentIntegrity());

    await waitFor(() => expect(result.current.checked).toBe(true));
    expect(result.current.missingAttachments).toEqual([]);
  });
});