import { defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { Node } from "@tiptap/pm/model";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

const tiptapSchema = getSchema([StarterKit.configure({ heading: { levels: [1, 2, 3] } })]);

export function markdownToProseMirrorJSON(md: string): string {
  if (!md.trim()) return '{"type":"doc","content":[]}';
  try {
    const doc = defaultMarkdownParser.parse(md);
    const json = doc.toJSON();
    if (json.content) {
      json.content = json.content.map((node: any) => {
        if (node.type === "heading" && node.attrs?.level > 3) {
          return { ...node, attrs: { ...node.attrs, level: 3 } };
        }
        return node;
      });
    }
    const tiptapDoc = Node.fromJSON(tiptapSchema, json);
    return JSON.stringify(tiptapDoc.toJSON());
  } catch {
    return '{"type":"doc","content":[]}';
  }
}

export function proseMirrorJSONToMarkdown(jsonStr: string): string {
  if (!jsonStr.trim()) return "";
  try {
    const parsed = JSON.parse(jsonStr);
    const doc = Node.fromJSON(tiptapSchema, parsed);
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