import { describe, it, expect } from "vitest";
import { createDefaultNote, NoteType } from "../../src/models/note";

describe("Note 模型", () => {
  it("createDefaultNote 应生成默认值", () => {
    const note = createDefaultNote({ title: "测试笔记" });
    expect(note.title).toBe("测试笔记");
    expect(note.contentJson).toBe("");
    expect(note.mdText).toBe("");
    expect(note.folderId).toBeNull();
    expect(note.type).toBe("rich");
    expect(note.deletedAt).toBeNull();
    expect(note.version).toBe(1);
  });

  it("createDefaultNote 应支持自定义输入", () => {
    const note = createDefaultNote({
      title: "自定义",
      contentJson: '{"type":"doc"}',
      mdText: "# 自定义",
      folderId: "folder-1",
      type: "markdown",
    });
    expect(note.contentJson).toBe('{"type":"doc"}');
    expect(note.mdText).toBe("# 自定义");
    expect(note.folderId).toBe("folder-1");
    expect(note.type).toBe("markdown");
  });
});