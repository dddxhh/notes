import { describe, it, expect } from "vitest";
import {
  markdownToProseMirrorJSON,
  proseMirrorJSONToMarkdown,
  extractTitleFromContent,
} from "../../src/lib/markdown-serializer";

describe("Markdown 序列化器", () => {
  it("markdownToProseMirrorJSON 应将 MD 转为 ProseMirror JSON", () => {
    const md = "# 标题\n\n段落内容";
    const json = markdownToProseMirrorJSON(md);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("doc");
    expect(parsed.content.length).toBeGreaterThan(0);
  });

  it("markdownToProseMirrorJSON 空字符串应返回空文档", () => {
    const json = markdownToProseMirrorJSON("");
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("doc");
    expect(parsed.content).toEqual([]);
  });

  it("proseMirrorJSONToMarkdown 应将 ProseMirror JSON 转回 MD", () => {
    const md = "# 标题\n\n段落内容";
    const json = markdownToProseMirrorJSON(md);
    const resultMd = proseMirrorJSONToMarkdown(json);
    expect(resultMd).toContain("标题");
    expect(resultMd).toContain("段落内容");
  });

  it("proseMirrorJSONToMarkdown 字符串应返回空字符串", () => {
    const result = proseMirrorJSONToMarkdown("");
    expect(result).toBe("");
  });

  it("extractTitleFromContent 应从内容提取标题", () => {
    expect(extractTitleFromContent("# 我的笔记\n\n内容")).toBe("我的笔记");
    expect(extractTitleFromContent("没有标题标记的内容")).toBe("没有标题标记的内容");
    expect(extractTitleFromContent("")).toBe("未命名笔记");
  });

  it("extractTitleFromContent 应截断超过50字符的标题", () => {
    const longTitle = "这是一个非常非常非常非常非常非常非常非常非常非常非常长的标题内容";
    expect(extractTitleFromContent(longTitle).length).toBeLessThanOrEqual(50);
  });
});