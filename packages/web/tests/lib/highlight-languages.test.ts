import { describe, it, expect } from "vitest";
import { lowlight, HIGHLIGHT_LANGUAGES } from "../../src/lib/highlight-languages";

describe("highlight-languages", () => {
  it("lowlight 应为有效的 lowlight 实例", () => {
    expect(lowlight).toBeDefined();
    expect(typeof lowlight.highlight).toBe("function");
  });

  it("HIGHLIGHT_LANGUAGES 应包含常用编程语言", () => {
    expect(HIGHLIGHT_LANGUAGES).toContain("javascript");
    expect(HIGHLIGHT_LANGUAGES).toContain("typescript");
    expect(HIGHLIGHT_LANGUAGES).toContain("python");
    expect(HIGHLIGHT_LANGUAGES).toContain("rust");
    expect(HIGHLIGHT_LANGUAGES).toContain("go");
    expect(HIGHLIGHT_LANGUAGES).toContain("java");
    expect(HIGHLIGHT_LANGUAGES).toContain("c");
    expect(HIGHLIGHT_LANGUAGES).toContain("cpp");
    expect(HIGHLIGHT_LANGUAGES).toContain("html");
    expect(HIGHLIGHT_LANGUAGES).toContain("css");
    expect(HIGHLIGHT_LANGUAGES).toContain("json");
    expect(HIGHLIGHT_LANGUAGES).toContain("yaml");
    expect(HIGHLIGHT_LANGUAGES).toContain("markdown");
    expect(HIGHLIGHT_LANGUAGES).toContain("bash");
    expect(HIGHLIGHT_LANGUAGES).toContain("sql");
    expect(HIGHLIGHT_LANGUAGES).toContain("xml");
    expect(HIGHLIGHT_LANGUAGES).toContain("ruby");
    expect(HIGHLIGHT_LANGUAGES).toContain("php");
  });

  it("HIGHLIGHT_LANGUAGES 应有18种语言", () => {
    expect(HIGHLIGHT_LANGUAGES.length).toBe(18);
  });

  it("lowlight 应能高亮 JavaScript 代码片段", () => {
    const result = lowlight.highlight("javascript", "const x = 42;");
    expect(result.type).toBe("root");
    expect(result.children.length).toBeGreaterThan(0);
    expect(result.data?.language).toBe("javascript");
  });

  it("lowlight 应能高亮 Python 代码片段", () => {
    const result = lowlight.highlight("python", "def hello():\n    print('world')");
    expect(result.type).toBe("root");
    expect(result.children.length).toBeGreaterThan(0);
    expect(result.data?.language).toBe("python");
  });

  it("lowlight 应能自动检测语言", () => {
    const result = lowlight.highlightAuto("function test() { return 1; }");
    expect(result.type).toBe("root");
    expect(result.children.length).toBeGreaterThan(0);
    expect(result.data?.language).toBeDefined();
  });
});