import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Y from "yjs";

vi.mock("./persistence", () => ({
  getDocUpdates: vi.fn().mockResolvedValue([]),
  storeUpdate: vi.fn().mockResolvedValue(undefined),
}));

import { DocManager } from "./doc-manager";
import { getDocUpdates, storeUpdate } from "./persistence";

describe("DocManager", () => {
  let manager: DocManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new DocManager();
  });

  it("should create and return a Yjs Doc", async () => {
    const doc = await manager.getDoc("note:test-1");
    expect(doc).toBeInstanceOf(Y.Doc);
  });

  it("should return the same Doc for the same docName", async () => {
    const doc1 = await manager.getDoc("note:test-1");
    const doc2 = await manager.getDoc("note:test-1");
    expect(doc1).toBe(doc2);
  });

  it("should load existing updates from persistence", async () => {
    const mockDoc = new Y.Doc();
    mockDoc.getText("content").insert(0, "hello");
    const update = Y.encodeStateAsUpdate(mockDoc);

    vi.mocked(getDocUpdates).mockResolvedValueOnce([new Uint8Array(update)]);

    const doc = await manager.getDoc("note:test-2");
    expect(doc.getText("content").toString()).toBe("hello");
  });

  it("should apply update and persist", async () => {
    const doc = await manager.getDoc("note:test-3");
    const update = Y.encodeStateAsUpdate(doc);

    await manager.applyUpdate("note:test-3", new Uint8Array(update), "user-1");
    expect(storeUpdate).toHaveBeenCalledWith("note:test-3", expect.any(Uint8Array), "user-1");
  });

  it("should track connection count and destroy doc when zero", async () => {
    await manager.getDoc("note:test-4");
    manager.addConnection("note:test-4");
    manager.addConnection("note:test-4");
    expect(manager.getConnectionCount("note:test-4")).toBe(2);

    manager.removeConnection("note:test-4");
    expect(manager.getConnectionCount("note:test-4")).toBe(1);

    manager.removeConnection("note:test-4");
    expect(manager.getConnectionCount("note:test-4")).toBe(0);
    expect(manager.hasDoc("note:test-4")).toBe(false);
  });

  it("should get all subscribers for a doc", async () => {
    await manager.getDoc("note:test-5");
    expect(manager.getSubscribers("note:test-5")).toEqual(new Set());
  });
});
