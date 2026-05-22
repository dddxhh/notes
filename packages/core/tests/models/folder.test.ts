import { describe, it, expect } from "vitest";
import { createDefaultFolder } from "../../src/models/folder";

describe("Folder 模型", () => {
  it("createDefaultFolder 应生成默认值", () => {
    const folder = createDefaultFolder({ name: "工作" });
    expect(folder.name).toBe("工作");
    expect(folder.parentId).toBeNull();
    expect(folder.sortOrder).toBe(0);
  });

  it("createDefaultFolder 应支持自定义 parentId 和 sortOrder", () => {
    const folder = createDefaultFolder({ name: "子目录", parentId: "parent-1", sortOrder: 5 });
    expect(folder.parentId).toBe("parent-1");
    expect(folder.sortOrder).toBe(5);
  });
});
