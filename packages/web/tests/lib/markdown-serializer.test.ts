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

describe("TaskList 序列化", () => {
  it("markdownToProseMirrorJSON 应解析 - [x] 已完成任务", () => {
    const md = "- [x] 已完成\n- [ ] 未完成";
    const json = markdownToProseMirrorJSON(md);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("doc");
    expect(parsed.content.length).toBeGreaterThan(0);
  });

  it("proseMirrorJSONToMarkdown 应将 taskList/taskItem 序列化为 - [x]/- [ ]", () => {
    const md = "- [x] 已完成\n- [ ] 未完成";
    const json = markdownToProseMirrorJSON(md);
    const resultMd = proseMirrorJSONToMarkdown(json);
    expect(resultMd).toContain("[x]");
    expect(resultMd).toContain("已完成");
  });
});

describe("Table 序列化", () => {
  it("markdownToProseMirrorJSON 应解析 Markdown 表格", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const json = markdownToProseMirrorJSON(md);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("doc");
    expect(parsed.content.length).toBeGreaterThan(0);
  });

  it("proseMirrorJSONToMarkdown 应将 table 序列化为 Markdown 表格", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const json = markdownToProseMirrorJSON(md);
    const resultMd = proseMirrorJSONToMarkdown(json);
    expect(resultMd).toContain("|");
    expect(resultMd).toContain("A");
  });
});

describe("CodeBlock with language 序列化", () => {
  it("markdownToProseMirrorJSON 应解析带语言的代码块", () => {
    const md = "```javascript\nconst x = 42;\n```";
    const json = markdownToProseMirrorJSON(md);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("doc");
    expect(parsed.content.length).toBeGreaterThan(0);
    const codeBlock = parsed.content.find((n: any) => n.type === "codeBlock");
    expect(codeBlock).toBeDefined();
    expect(codeBlock.attrs?.language).toBe("javascript");
  });

  it("markdownToProseMirrorJSON 应解析无语言的代码块", () => {
    const md = "```\nplain code\n```";
    const json = markdownToProseMirrorJSON(md);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("doc");
    expect(parsed.content.length).toBeGreaterThan(0);
    const codeBlock = parsed.content.find((n: any) => n.type === "codeBlock");
    expect(codeBlock).toBeDefined();
  });

  it("proseMirrorJSONToMarkdown 应将 codeBlock+language 序列化为 ```lang", () => {
    const md = "```javascript\nconst x = 42;\n```";
    const json = markdownToProseMirrorJSON(md);
    const resultMd = proseMirrorJSONToMarkdown(json);
    expect(resultMd).toContain("javascript");
    expect(resultMd).toContain("const x = 42;");
  });
});

describe("customImage 序列化", () => {
  it("markdownToProseMirrorJSON 应将 ![alt](src) 转为 customImage 节点", () => {
    const md = "![photo](https://example.com/img.jpg)";
    const json = markdownToProseMirrorJSON(md);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe("doc");
    expect(parsed.content.length).toBeGreaterThan(0);
    const customImageNode = parsed.content.find((n: any) => n.type === "customImage");
    expect(customImageNode).toBeDefined();
    expect(customImageNode.attrs.src).toBe("https://example.com/img.jpg");
    expect(customImageNode.attrs.alt).toBe("photo");
  });

  it("markdownToProseMirrorJSON 应将 attachment:// src 转为 customImage 节点并保留 src", () => {
    const md = "![photo](attachment://att-123)";
    const json = markdownToProseMirrorJSON(md);
    const parsed = JSON.parse(json);
    const customImageNode = parsed.content.find((n: any) => n.type === "customImage");
    expect(customImageNode).toBeDefined();
    expect(customImageNode.attrs.src).toBe("attachment://att-123");
  });

  it("proseMirrorJSONToMarkdown 应将 customImage 序列化为 ![alt](src)", () => {
    const md = "![photo](https://example.com/img.jpg)";
    const json = markdownToProseMirrorJSON(md);
    const resultMd = proseMirrorJSONToMarkdown(json);
    expect(resultMd).toContain("![photo](https://example.com/img.jpg)");
  });

  it("proseMirrorJSONToMarkdown 应保留 attachment:// src 在 Markdown 输出", () => {
    const md = "![photo](attachment://att-123)";
    const json = markdownToProseMirrorJSON(md);
    const resultMd = proseMirrorJSONToMarkdown(json);
    expect(resultMd).toContain("attachment://att-123");
  });
});

describe("customVideo 序列化", () => {
  it("proseMirrorJSONToMarkdown 应将 customVideo 序列化为 HTML video 标记", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "customVideo",
          attrs: { src: "attachment://vid-456", title: null },
        },
      ],
    });
    const resultMd = proseMirrorJSONToMarkdown(json);
    expect(resultMd).toContain("attachment://vid-456");
    expect(resultMd).toContain("<video");
  });
});