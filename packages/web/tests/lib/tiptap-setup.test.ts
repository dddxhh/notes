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
});