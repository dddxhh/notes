import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlashCommandPanel } from "../../src/components/shared/SlashCommandPanel";
import type { SlashCommandItem } from "../../src/components/shared/SlashCommandPanel";

const mockItems: SlashCommandItem[] = [
  { title: "Heading 1", description: "Large heading", command: vi.fn() },
  { title: "Heading 2", description: "Medium heading", command: vi.fn() },
  { title: "Bullet List", description: "Create a bullet list", command: vi.fn() },
  { title: "Code Block", description: "Insert code block", command: vi.fn() },
];

describe("SlashCommandPanel", () => {
  let panel: SlashCommandPanel;

  beforeEach(() => {
    vi.clearAllMocks();
    panel = new SlashCommandPanel({
      items: mockItems,
      onClick: vi.fn(),
    });
  });

  it("renders DOM element with all items", () => {
    panel.updateProps({ items: mockItems });
    expect(panel.element.querySelectorAll(".slash-command-item").length).toBe(4);
    expect(panel.element.textContent).toContain("Heading 1");
    expect(panel.element.textContent).toContain("Bullet List");
  });

  it("renders filtered items based on query", () => {
    panel.updateProps({
      items: mockItems.filter((i) => i.title.toLowerCase().startsWith("heading")),
    });
    expect(panel.element.querySelectorAll(".slash-command-item").length).toBe(2);
    expect(panel.element.textContent).toContain("Heading 1");
    expect(panel.element.textContent).toContain("Heading 2");
    expect(panel.element.textContent).not.toContain("Bullet List");
  });

  it("selects first item by default (selectedIndex = 0)", () => {
    panel.updateProps({ items: mockItems });
    const items = panel.element.querySelectorAll(".slash-command-item");
    expect(items[0].classList.contains("is-selected")).toBe(true);
    expect(items[1].classList.contains("is-selected")).toBe(false);
  });

  it("ArrowDown moves selection to next item", () => {
    panel.updateProps({ items: mockItems });
    panel.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) } as any);
    const items = panel.element.querySelectorAll(".slash-command-item");
    expect(items[0].classList.contains("is-selected")).toBe(false);
    expect(items[1].classList.contains("is-selected")).toBe(true);
  });

  it("ArrowUp moves selection to previous item", () => {
    panel.updateProps({ items: mockItems });
    panel.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) } as any);
    panel.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowUp" }) } as any);
    const items = panel.element.querySelectorAll(".slash-command-item");
    expect(items[0].classList.contains("is-selected")).toBe(true);
    expect(items[1].classList.contains("is-selected")).toBe(false);
  });

  it("ArrowDown wraps around to first item from last", () => {
    panel.updateProps({ items: mockItems });
    for (let i = 0; i < 3; i++) {
      panel.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) } as any);
    }
    const itemsBeforeWrap = panel.element.querySelectorAll(".slash-command-item");
    expect(itemsBeforeWrap[3].classList.contains("is-selected")).toBe(true);
    panel.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) } as any);
    const itemsAfterWrap = panel.element.querySelectorAll(".slash-command-item");
    expect(itemsAfterWrap[0].classList.contains("is-selected")).toBe(true);
  });

  it("Enter calls onClick with selected item", () => {
    const onClick = vi.fn();
    const panel2 = new SlashCommandPanel({ items: mockItems, onClick });
    panel2.updateProps({ items: mockItems });
    panel2.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Enter" }) } as any);
    expect(onClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it("ArrowDown then Enter calls onClick with second item", () => {
    const onClick = vi.fn();
    const panel2 = new SlashCommandPanel({ items: mockItems, onClick });
    panel2.updateProps({ items: mockItems });
    panel2.onKeyDown({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) } as any);
    panel2.onKeyDown({ event: new KeyboardEvent("keydown", { key: "Enter" }) } as any);
    expect(onClick).toHaveBeenCalledWith(mockItems[1]);
  });

  it("clicking an item triggers onClick", () => {
    const onClick = vi.fn();
    const panel2 = new SlashCommandPanel({ items: mockItems, onClick });
    panel2.updateProps({ items: mockItems });
    const secondItem = panel2.element.querySelectorAll(".slash-command-item")[1];
    secondItem.dispatchEvent(new MouseEvent("click"));
    expect(onClick).toHaveBeenCalledWith(mockItems[1]);
  });

  it("destroy removes element content", () => {
    panel.updateProps({ items: mockItems });
    panel.destroy();
    expect(panel.element.innerHTML).toBe("");
  });
});
