import { describe, it, expect, vi } from "vitest";
import { SlashCommandItems, filterItems } from "../../src/lib/SlashCommand";

describe("SlashCommandItems", () => {
  it("contains heading commands", () => {
    const headings = SlashCommandItems.filter((i) => i.title.startsWith("Heading"));
    expect(headings.length).toBeGreaterThanOrEqual(2);
    expect(headings.some((h) => h.title === "Heading 1")).toBe(true);
    expect(headings.some((h) => h.title === "Heading 2")).toBe(true);
  });

  it("contains list commands", () => {
    const lists = SlashCommandItems.filter((i) => i.title.includes("List"));
    expect(lists.length).toBeGreaterThanOrEqual(2);
    expect(lists.some((l) => l.title === "Bullet List")).toBe(true);
    expect(lists.some((l) => l.title === "Numbered List")).toBe(true);
  });

  it("contains code block command", () => {
    const code = SlashCommandItems.find((i) => i.title === "代码块");
    expect(code).toBeDefined();
    expect(code!.description).toBeTruthy();
  });

  it("contains blockquote command", () => {
    const quote = SlashCommandItems.find((i) => i.title === "Blockquote");
    expect(quote).toBeDefined();
  });

  it("contains horizontal rule command", () => {
    const hr = SlashCommandItems.find((i) => i.title === "Horizontal Rule");
    expect(hr).toBeDefined();
  });

  it("contains image command", () => {
    const image = SlashCommandItems.find((i) => i.title === "Image");
    expect(image).toBeDefined();
  });

  it("contains video command", () => {
    const video = SlashCommandItems.find((i) => i.title === "Video");
    expect(video).toBeDefined();
  });
});

describe("filterItems", () => {
  it("returns items matching query", () => {
    const filtered = filterItems({ query: "head" });
    expect(filtered.length).toBeGreaterThanOrEqual(2);
    expect(filtered.every((i) => i.title.toLowerCase().includes("head"))).toBe(true);
  });

  it("returns all items when query is empty", () => {
    const filtered = filterItems({ query: "" });
    expect(filtered.length).toBe(SlashCommandItems.length);
  });

  it("returns empty array for non-matching query", () => {
    const filtered = filterItems({ query: "zzzzz" });
    expect(filtered.length).toBe(0);
  });
});