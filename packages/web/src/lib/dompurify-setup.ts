import DOMPurify from "dompurify";

const savedSrcs = new WeakMap<Element, string>();

DOMPurify.addHook("beforeSanitizeAttributes", (node) => {
  if (node.tagName === "IMG" || node.tagName === "VIDEO") {
    const src = node.getAttribute("src");
    if (src && src.startsWith("attachment://")) {
      savedSrcs.set(node, src);
    }
  }
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "IMG" || node.tagName === "VIDEO") {
    const savedSrc = savedSrcs.get(node);
    if (savedSrc) {
      node.setAttribute("src", savedSrc);
      savedSrcs.delete(node);
    }
  }
});

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
      "strong", "em", "u", "s", "code", "pre", "blockquote",
      "ul", "ol", "li", "a", "img", "video",
      "table", "thead", "tbody", "tr", "th", "td",
      "input", "label", "div", "span",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "id",
      "type", "checked", "controls", "loading",
      "colspan", "rowspan", "width", "height",
    ],
    ALLOW_DATA_ATTR: false,
  });
}