import { describe, it, expect } from "vitest";
import { SearchInput, SearchResult, TagFilterMode } from "../../src/models/search";

describe("Search 模型", () => {
  it("SearchInput 默认值应为 undefined", () => {
    const input: SearchInput = {};
    expect(input.query).toBeUndefined();
    expect(input.limit).toBeUndefined();
    expect(input.tagMode).toBeUndefined();
  });

  it("TagFilterMode 应包含交集和并集", () => {
    const modes: TagFilterMode[] = ["intersection", "union"];
    expect(modes).toHaveLength(2);
  });

  it("SearchResult 应包含 notes、total、hasMore", () => {
    const result: SearchResult = { notes: [], total: 0, hasMore: false };
    expect(result.notes).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});