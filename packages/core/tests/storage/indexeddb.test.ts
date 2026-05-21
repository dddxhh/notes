import { describe, it, expect } from "vitest";
import {
  initIndexedDB,
  closeIndexedDB,
  saveBlob,
  getBlob,
  saveThumbnail,
  getThumbnail,
  deleteBlob,
} from "../../src/storage/indexeddb";

describe("IndexedDB 附件存储", () => {
  afterEach(() => {
    closeIndexedDB();
  });

  it("saveBlob + getBlob 应正确存储和检索", async () => {
    await initIndexedDB();
    const blob = new Blob(["hello world"], { type: "text/plain" });
    await saveBlob("test-1", blob);
    const retrieved = await getBlob("test-1");
    expect(retrieved).not.toBeNull();
  });

  it("getBlob 不存在的 ID 应返回 null", async () => {
    await initIndexedDB();
    const result = await getBlob("nonexistent");
    expect(result).toBeNull();
  });

  it("saveThumbnail + getThumbnail 应正确工作", async () => {
    await initIndexedDB();
    const blob = new Blob(["thumbnail data"], { type: "image/webp" });
    await saveThumbnail("thumb-1", blob);
    const retrieved = await getThumbnail("thumb-1");
    expect(retrieved).not.toBeNull();
  });

  it("deleteBlob 应同时删除附件和缩略图", async () => {
    await initIndexedDB();
    const blob = new Blob(["attachment"], { type: "text/plain" });
    const thumb = new Blob(["thumbnail"], { type: "image/webp" });
    await saveBlob("del-1", blob);
    await saveThumbnail("del-1", thumb);
    await deleteBlob("del-1");
    expect(await getBlob("del-1")).toBeNull();
    expect(await getThumbnail("del-1")).toBeNull();
  });
});