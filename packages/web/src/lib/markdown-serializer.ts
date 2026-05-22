import { defaultMarkdownParser, defaultMarkdownSerializer, schema } from "prosemirror-markdown";
import { Node } from "@tiptap/pm/model";

export function markdownToProseMirrorJSON(md: string): string {
  if (!md.trim()) return '{"type":"doc","content":[]}';
  try {
    const doc = defaultMarkdownParser.parse(md);
    return JSON.stringify(doc.toJSON());
  } catch {
    return '{"type":"doc","content":[]}';
  }
}

export function proseMirrorJSONToMarkdown(jsonStr: string): string {
  if (!jsonStr.trim()) return "";
  try {
    const parsed = JSON.parse(jsonStr);
    const doc = Node.fromJSON(schema, parsed);
    return defaultMarkdownSerializer.serialize(doc);
  } catch {
    return "";
  }
}

export function extractTitleFromContent(content: string): string {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "未命名笔记";
  const firstLine = lines[0].replace(/^#+\s*/, "").trim();
  return firstLine.slice(0, 50) || "未命名笔记";
}