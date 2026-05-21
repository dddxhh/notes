import { describe, it, expect } from "vitest";
import { generateId } from "../../src/utils/uuid";

describe("UUID 工具", () => {
  it("generateId 应返回标准 UUID 格式", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("generateId 每次应返回不同值", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});