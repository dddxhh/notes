import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "../../src/lib/dompurify-setup";

describe("DOMPurify XSS protection", () => {
  describe("XSS script tag filtering", () => {
    it("should remove style tags (CSS XSS vector)", () => {
      const result = sanitizeHtml("<style>body{display:none}</style><p>text</p>");
      expect(result).not.toContain("<style");
      expect(result).toContain("<p>text</p>");
    });

    it("should remove form tags (form XSS vector)", () => {
      const result = sanitizeHtml('<form action="https://evil.com"><p>text</p></form>');
      expect(result).not.toContain("<form");
    });

    it("should remove meta tags", () => {
      const result = sanitizeHtml('<meta http-equiv="refresh" content="0;url=evil">');
      expect(result).not.toContain("<meta");
    });

    it("should remove javascript: URIs in href", () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
      expect(result).not.toContain("javascript:");
    });
  });

  describe("attachment:// src preservation", () => {
    it("should preserve attachment:// src on img tags", () => {
      const result = sanitizeHtml('<img src="attachment://abc123">');
      expect(result).toContain("attachment://abc123");
      expect(result).toContain("<img");
    });

    it("should preserve attachment:// src on video tags", () => {
      const result = sanitizeHtml('<video src="attachment://vid456" controls></video>');
      expect(result).toContain("attachment://vid456");
      expect(result).toContain("<video");
    });

    it("should preserve https src on img tags", () => {
      const result = sanitizeHtml('<img src="https://example.com/img.png">');
      expect(result).toContain("https://example.com/img.png");
    });
  });

  describe("dangerous attribute removal", () => {
    it("should remove onclick attribute", () => {
      const result = sanitizeHtml('<div onclick="alert(1)">text</div>');
      expect(result).not.toContain("onclick");
    });

    it("should remove onerror attribute", () => {
      const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
      expect(result).not.toContain("onerror");
    });

    it("should remove onmouseover attribute", () => {
      const result = sanitizeHtml('<div onmouseover="alert(1)">text</div>');
      expect(result).not.toContain("onmouseover");
    });

    it("should remove data-* attributes", () => {
      const result = sanitizeHtml('<div data-evil="bad">text</div>');
      expect(result).not.toContain("data-evil");
    });
  });

  describe("legitimate HTML preservation", () => {
    it("should preserve headings", () => {
      const result = sanitizeHtml("<h1>Title</h1><h2>Sub</h2>");
      expect(result).toContain("<h1>Title</h1>");
      expect(result).toContain("<h2>Sub</h2>");
    });

    it("should preserve lists", () => {
      const result = sanitizeHtml("<ul><li>item</li></ul>");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>item</li>");
    });

    it("should preserve links with href", () => {
      const result = sanitizeHtml('<a href="https://example.com">link</a>');
      expect(result).toContain("href");
      expect(result).toContain("<a");
    });

    it("should preserve images with src and alt", () => {
      const result = sanitizeHtml('<img src="https://example.com/img.png" alt="photo">');
      expect(result).toContain("src");
      expect(result).toContain("alt");
    });

    it("should preserve code and pre tags", () => {
      const result = sanitizeHtml("<pre><code>const x = 1;</code></pre>");
      expect(result).toContain("<pre>");
      expect(result).toContain("<code>");
    });

    it("should preserve tables", () => {
      const result = sanitizeHtml(
        "<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>",
      );
      expect(result).toContain("<table>");
      expect(result).toContain("<th>");
      expect(result).toContain("<td>");
    });
  });

  describe("video with controls", () => {
    it("should preserve video controls attribute", () => {
      const result = sanitizeHtml('<video controls><source src="vid.mp4"></video>');
      expect(result).toContain("controls");
      expect(result).toContain("<video");
    });
  });
});
