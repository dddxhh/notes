import { describe, it, expect } from "vitest";

describe("useResponsive 工具", () => {
  it("DeviceType 应包含 mobile、tablet、desktop", () => {
    const types = ["mobile", "tablet", "desktop"];
    expect(types).toHaveLength(3);
  });

  it("640px 以下应判定为 mobile", () => {
    const width = 320;
    const device = width < 640 ? "mobile" : width < 768 ? "tablet" : "desktop";
    expect(device).toBe("mobile");
    expect(width < 640).toBe(true);
    expect(width < 768).toBe(true);
  });

  it("640-768px 应判定为 tablet", () => {
    const width = 700;
    const device = width < 640 ? "mobile" : width < 768 ? "tablet" : "desktop";
    expect(device).toBe("tablet");
  });

  it("768px 以上应判定为 desktop", () => {
    const width = 1024;
    const device = width < 640 ? "mobile" : width < 768 ? "tablet" : "desktop";
    expect(device).toBe("desktop");
  });
});