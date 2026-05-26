import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebStorageAdapter } from "../../src/storage/web-adapter";
import { generateId } from "../../src/utils";

describe.skip("WebStorageAdapter CRUD (WASM not available in vitest/happy-dom)", () => {
  let adapter: WebStorageAdapter;

  beforeAll(async () => {
    adapter = new WebStorageAdapter();
    await adapter.init();
  });

  afterAll(async () => {
    await adapter.close();
  });

  describe("Notes CRUD", () => {
    it("createNote + getNote", async () => {
      const note = await adapter.createNote({ title: "测试笔记" });
      expect(note.id).toBeTruthy();
      expect(note.title).toBe("测试笔记");
      expect(note.type).toBe("rich");
      expect(note.deletedAt).toBeNull();

      const fetched = await adapter.getNote(note.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(note.id);
      expect(fetched!.title).toBe("测试笔记");
    });

    it("updateNote", async () => {
      const note = await adapter.createNote({ title: "原始标题" });
      const updated = await adapter.updateNote(note.id, { title: "更新标题", mdText: "# 内容" });
      expect(updated.title).toBe("更新标题");
      expect(updated.mdText).toBe("# 内容");
      expect(updated.version).toBe(2);
    });

    it("deleteNote (soft delete)", async () => {
      const note = await adapter.createNote({ title: "待删除" });
      await adapter.deleteNote(note.id);
      const deleted = await adapter.getNote(note.id);
      expect(deleted!.deletedAt).not.toBeNull();
    });

    it("listNotes", async () => {
      const folderId = generateId();
      await adapter.createNote({ title: "笔记1", folderId });
      await adapter.createNote({ title: "笔记2", folderId });
      const notes = await adapter.listNotes(folderId);
      expect(notes.length).toBe(2);
    });
  });

  describe("Folders CRUD", () => {
    it("createFolder + listFolders", async () => {
      const folder = await adapter.createFolder({ name: "根目录" });
      expect(folder.id).toBeTruthy();
      expect(folder.name).toBe("根目录");
      expect(folder.parentId).toBeNull();

      const folders = await adapter.listFolders(null);
      expect(folders.some((f) => f.id === folder.id)).toBe(true);
    });

    it("subfolders", async () => {
      const parent = await adapter.createFolder({ name: "父目录" });
      const child = await adapter.createFolder({ name: "子目录", parentId: parent.id });
      expect(child.parentId).toBe(parent.id);

      const children = await adapter.listFolders(parent.id);
      expect(children.length).toBe(1);
      expect(children[0].id).toBe(child.id);
    });
  });

  describe("Tags CRUD", () => {
    it("createTag + listTags", async () => {
      const tag = await adapter.createTag("重要");
      expect(tag.id).toBeTruthy();
      expect(tag.name).toBe("重要");

      const tags = await adapter.listTags();
      expect(tags.some((t) => t.id === tag.id)).toBe(true);
    });

    it("addTagsToNote + getTagsForNote", async () => {
      const note = await adapter.createNote({ title: "带标签笔记" });
      const tag1 = await adapter.createTag("标签1");
      const tag2 = await adapter.createTag("标签2");
      await adapter.addTagsToNote(note.id, [tag1.id, tag2.id]);
      const tags = await adapter.getTagsForNote(note.id);
      expect(tags.length).toBe(2);
    });

    it("removeTagsFromNote", async () => {
      const note = await adapter.createNote({ title: "移除标签笔记" });
      const tag = await adapter.createTag("待移除");
      await adapter.addTagsToNote(note.id, [tag.id]);
      await adapter.removeTagsFromNote(note.id, [tag.id]);
      const tags = await adapter.getTagsForNote(note.id);
      expect(tags.length).toBe(0);
    });
  });

  describe("WebStorageAdapter batch methods", () => {
    it("updateNotesFolderId moves all notes from one folder to another", async () => {
      const folder1 = await adapter.createFolder({ name: "folder1" });
      const folder2 = await adapter.createFolder({ name: "folder2" });
      await adapter.createNote({ title: "note1", folderId: folder1.id });
      await adapter.createNote({ title: "note2", folderId: folder1.id });

      await adapter.updateNotesFolderId(folder1.id, folder2.id);

      const notes = await adapter.listNotes(folder2.id);
      expect(notes.length).toBe(2);
    });

    it("updateNotesFolderId sets folderId to null when newFolderId is null", async () => {
      const folder = await adapter.createFolder({ name: "folder" });
      await adapter.createNote({ title: "note", folderId: folder.id });

      await adapter.updateNotesFolderId(folder.id, null);

      const allNotes = await adapter.listNotes();
      const note = allNotes.find((n) => n.title === "note");
      expect(note?.folderId).toBeNull();
    });

    it("softDeleteNotesByFolder soft-deletes all notes in a folder", async () => {
      const folder = await adapter.createFolder({ name: "folder" });
      await adapter.createNote({ title: "note1", folderId: folder.id });
      await adapter.createNote({ title: "note2", folderId: folder.id });

      await adapter.softDeleteNotesByFolder(folder.id);

      const activeNotes = await adapter.listNotes(folder.id);
      expect(activeNotes.length).toBe(0);
    });
  });
});
