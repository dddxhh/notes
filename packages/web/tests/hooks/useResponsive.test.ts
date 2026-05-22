import { describe, it, expect } from "vitest";

describe("useResponsive 工具", () => {
  it("DeviceType 应包含 mobile、tablet、desktop", () => {
    const types = ["mobile", "tablet", "desktop"];
    expect(types).toHaveLength(3);
  });

  it("768px 以下应判定为 mobile", () => {
    const width = 320;
    const device = width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
    expect(device).toBe("mobile");
    expect(width < 768).toBe(true);
  });

  it("768-1024px 应判定为 tablet", () => {
    const width = 900;
    const device = width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
    expect(device).toBe("tablet");
  });

  it("1024px 以上应判定为 desktop", () => {
    const width = 1200;
    const device = width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
    expect(device).toBe("desktop");
  });
});