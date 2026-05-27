import { describe, it, expect } from "vitest";
import { formatDateTime, formatShortDateTime } from "../../src/lib/format-date";

describe("formatDateTime", () => {
  it("returns empty string for null", () => {
    expect(formatDateTime(null)).toBe("");
  });

  it("returns date and time for valid timestamp", () => {
    const ts = new Date(2025, 5, 15, 14, 30, 0).getTime();
    const result = formatDateTime(ts);
    expect(result).toContain("2025");
    expect(result).toContain("14");
    expect(result).toContain("30");
  });

  it("formats time with 2-digit hours and minutes", () => {
    const ts = new Date(2025, 0, 1, 9, 5, 0).getTime();
    const result = formatDateTime(ts);
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe("formatShortDateTime", () => {
  it("returns empty string for null", () => {
    expect(formatShortDateTime(null)).toBe("");
  });

  it("returns short date and time for valid timestamp", () => {
    const ts = new Date(2025, 5, 15, 14, 30, 0).getTime();
    const result = formatShortDateTime(ts);
    expect(result).toContain("14");
    expect(result).toContain("30");
  });

  it("includes month and day without full year", () => {
    const ts = new Date(2025, 5, 15, 14, 30, 0).getTime();
    const result = formatShortDateTime(ts);
    expect(result).toMatch(/\d+月\d+日 \d{2}:\d{2}/);
  });
});
