import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const cssPath = path.resolve(__dirname, "../../src/styles/globals.css");
const cssContent = fs.readFileSync(cssPath, "utf-8");

describe("globals.css attachment styles", () => {
  it("contains .ProseMirror img.custom-image styles", () => {
    expect(cssContent).toContain(".ProseMirror img.custom-image");
  });

  it("contains .ProseMirror video.custom-video styles", () => {
    expect(cssContent).toContain(".ProseMirror video.custom-video");
  });

  it("contains attachment loading state styles", () => {
    expect(cssContent).toContain(".attachment-loading");
  });

  it("contains attachment error state styles", () => {
    expect(cssContent).toContain(".attachment-error");
  });

  it("contains .toast-container styles", () => {
    expect(cssContent).toContain(".toast-container");
  });

  it("contains .toast styles", () => {
    expect(cssContent).toContain(".toast");
  });

  it("contains .toast-success styles", () => {
    expect(cssContent).toContain(".toast-success");
  });

  it("contains .toast-error styles", () => {
    expect(cssContent).toContain(".toast-error");
  });

  it("contains slash command panel styles", () => {
    expect(cssContent).toContain(".slash-command-panel");
  });

  it("contains upload toolbar button styles", () => {
    expect(cssContent).toContain(".upload-toolbar-btn");
  });
});
