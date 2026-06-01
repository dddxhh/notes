import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  pullAll,
  pushNote,
  pushQueue,
  isPullingFromRemote,
  setSyncClient,
} from "../../src/lib/sync-metadata";
import { SyncClient, MetadataSyncResponse } from "../../src/lib/sync-client";
import { getStorage } from "../../src/lib";
import { useNotesStore, useFoldersStore, useTagsStore } from "../../src/stores";

vi.mock("../../src/lib", () => ({
  getStorage: vi.fn(),
}));

vi.mock("../../src/stores", () => ({
  useNotesStore: { getState: vi.fn() },
  useFoldersStore: { getState: vi.fn() },
  useTagsStore: { getState: vi.fn() },
}));

describe("sync-metadata", () => {
  let mockClient: SyncClient;
  let mockStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      listFolders: vi.fn().mockResolvedValue([]),
      listNotes: vi.fn().mockResolvedValue([]),
      listAllNotes: vi.fn().mockResolvedValue([]),
      listTags: vi.fn().mockResolvedValue([]),
      createFolder: vi.fn().mockResolvedValue({}),
      updateFolder: vi.fn().mockResolvedValue({}),
    };

    vi.mocked(getStorage).mockReturnValue(mockStorage);
    vi.mocked(useNotesStore.getState).mockReturnValue({
      setNotes: vi.fn(),
      setSharedNotes: vi.fn(),
      setSharedNotePermissions: vi.fn(),
    } as any);
    vi.mocked(useFoldersStore.getState).mockReturnValue({ setFolders: vi.fn() } as any);
    vi.mocked(useTagsStore.getState).mockReturnValue({ setTags: vi.fn() } as any);

    mockClient = {
      pullMetadata: vi.fn(),
      pushMetadata: vi.fn(),
    } as any;

    setSyncClient(mockClient);
  });

  it("should pull remote folders and create locally when missing", async () => {
    const remoteData: MetadataSyncResponse = {
      notes: [],
      folders: [
        {
          id: "folder-1",
          name: "Remote Folder",
          parentId: null,
          sortOrder: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      tags: [],
      noteTags: [],
      attachments: [],
    };

    vi.mocked(mockClient.pullMetadata).mockResolvedValue(remoteData);

    await pullAll(mockClient);

    expect(mockStorage.createFolder).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Remote Folder",
      }),
    );
  });

  it("should set isPulling flag during pullAll", async () => {
    vi.mocked(mockClient.pullMetadata).mockResolvedValue({
      notes: [],
      folders: [],
      tags: [],
      noteTags: [],
      attachments: [],
    });

    expect(isPullingFromRemote()).toBe(false);
    const promise = pullAll(mockClient);
    expect(isPullingFromRemote()).toBe(true);
    await promise;
    expect(isPullingFromRemote()).toBe(false);
  });
});
