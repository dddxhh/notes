import { describe, it, expect, vi } from "vitest";

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn(() => ({ name: "starterKit" })) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: vi.fn(() => ({ name: "placeholder" })) },
}));

vi.mock("@tiptap/extension-character-count", () => ({
  default: { name: "characterCount" },
}));

vi.mock("../../src/lib/CustomImage", () => ({
  CustomImage: { name: "customImage" },
}));

vi.mock("../../src/lib/CustomVideo", () => ({
  CustomVideo: { name: "customVideo" },
}));

vi.mock("../../src/lib/SlashCommandExtension", () => ({
  SlashCommand: { name: "slashCommand" },
}));

vi.mock("@tiptap/extension-task-list", () => ({
  default: { name: "taskList" },
}));

vi.mock("@tiptap/extension-task-item", () => ({
  default: { configure: vi.fn(() => ({ name: "taskItem" })) },
}));

vi.mock("@tiptap/extension-table", () => ({
  default: { configure: vi.fn(() => ({ name: "table" })) },
}));

vi.mock("@tiptap/extension-table-row", () => ({
  default: { name: "tableRow" },
}));

vi.mock("@tiptap/extension-table-cell", () => ({
  default: { name: "tableCell" },
}));

vi.mock("@tiptap/extension-table-header", () => ({
  default: { name: "tableHeader" },
}));

vi.mock("@tiptap/extension-code-block-lowlight", () => ({
  default: { configure: vi.fn(() => ({ name: "codeBlock" })) },
}));

vi.mock("@tiptap/extension-horizontal-rule", () => ({
  default: { name: "horizontalRule" },
}));

vi.mock("../../src/lib/highlight-languages", () => ({
  lowlight: { highlight: vi.fn() },
  HIGHLIGHT_LANGUAGES: ["javascript"],
}));

import { getEditorExtensions } from "../../src/lib/tiptap-setup";
import { CustomImage } from "../../src/lib/CustomImage";
import { CustomVideo } from "../../src/lib/CustomVideo";
import { SlashCommand } from "../../src/lib/SlashCommandExtension";

describe("getEditorExtensions", () => {
  it("includes CustomImage extension", () => {
    const extensions = getEditorExtensions(false);
    const names = extensions.map((ext: any) => ext.name ?? ext?.default?.name);
    expect(names).toContain("customImage");
  });

  it("includes CustomVideo extension", () => {
    const extensions = getEditorExtensions(false);
    const names = extensions.map((ext: any) => ext.name ?? ext?.default?.name);
    expect(names).toContain("customVideo");
  });

  it("includes SlashCommand extension", () => {
    const extensions = getEditorExtensions(false);
    const names = extensions.map((ext: any) => ext.name ?? ext?.default?.name);
    expect(names).toContain("slashCommand");
  });

  it("includes StarterKit, Placeholder, CharacterCount", () => {
    const extensions = getEditorExtensions(false);
    expect(extensions.length).toBeGreaterThanOrEqual(6);
  });

  it("includes TaskList and TaskItem extensions", () => {
    const extensions = getEditorExtensions(false);
    const names = extensions.map((ext: any) => ext.name ?? ext?.default?.name);
    expect(names).toContain("taskList");
    expect(names).toContain("taskItem");
  });

  it("includes Table extensions (table, tableRow, tableCell, tableHeader)", () => {
    const extensions = getEditorExtensions(false);
    const names = extensions.map((ext: any) => ext.name ?? ext?.default?.name);
    expect(names).toContain("table");
    expect(names).toContain("tableRow");
    expect(names).toContain("tableCell");
    expect(names).toContain("tableHeader");
  });

  it("includes CodeBlockLowlight and HorizontalRule extensions", () => {
    const extensions = getEditorExtensions(false);
    const names = extensions.map((ext: any) => ext.name ?? ext?.default?.name);
    expect(names).toContain("codeBlock");
    expect(names).toContain("horizontalRule");
  });
});
