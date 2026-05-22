import { MarkdownParser, MarkdownSerializer } from "prosemirror-markdown";
import { Node } from "@tiptap/pm/model";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import markdownit from "markdown-it";
import { lowlight } from "./highlight-languages";
import { CustomImage } from "./CustomImage";
import { CustomVideo } from "./CustomVideo";

const tiptapExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: { keepMarks: true },
    orderedList: { keepMarks: true },
    codeBlock: false,
    horizontalRule: false,
  }),
  Placeholder.configure({ placeholder: "想写点什么？" }),
  CharacterCount,
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableCell,
  TableHeader,
  CodeBlockLowlight.configure({ lowlight }),
  HorizontalRule,
  CustomImage,
  CustomVideo,
];

const tiptapSchema = getSchema(tiptapExtensions);

const mdTokenizer = markdownit("commonmark", { html: false });

function getHeadingLevel(token: any): number {
  const match = /^(h\d)$/.exec(token.tag);
  return match ? parseInt(match[1][1]) : 1;
}

const parserTokens: Record<string, any> = {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  heading: {
    block: "heading",
    getAttrs: (token: any) => ({ level: getHeadingLevel(token) }),
  },
  bullet_list: { block: "bulletList" },
  ordered_list: { block: "orderedList", getAttrs: (token: any) => ({ start: token.attrGet("start") || 1 }) },
  list_item: { block: "listItem" },
  fence: {
    block: "codeBlock",
    noCloseToken: true,
    getAttrs: (token: any) => ({ language: token.info || null }),
  },
  code_block: {
    block: "codeBlock",
    noCloseToken: true,
    getAttrs: () => ({ language: null }),
  },
  hr: { node: "horizontalRule" },
  hardbreak: { node: "hardBreak" },
  em: { mark: "em" },
  strong: { mark: "strong" },
  link: {
    mark: "link",
    getAttrs: (token: any) => ({
      href: token.attrGet("href"),
      title: token.attrGet("title") || null,
    }),
  },
  code_inline: { mark: "code", noCloseToken: true },
};

const customParser = new MarkdownParser(tiptapSchema, mdTokenizer, parserTokens);

function extractImages(md: string): { md: string; images: { alt: string; src: string }[] } {
  const images: { alt: string; src: string }[] = [];
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const processedMd = md.replace(imageRegex, (_match: string, alt: string, src: string) => {
    images.push({ alt, src });
    return `%%IMAGE_${images.length - 1}%%`;
  });
  return { md: processedMd, images };
}

function replaceImagePlaceholders(json: any, images: { alt: string; src: string }[]): any {
  if (!json.content) return json;
  json.content = json.content.flatMap((node: any) => {
    if (node.type === "paragraph" && node.content) {
      const fullText = node.content
        .filter((n: any) => n.type === "text")
        .map((n: any) => n.text)
        .join("");
      const match = fullText.match(/^%%IMAGE_(\d+)%%$/);
      if (match) {
        const idx = parseInt(match[1]);
        if (idx < images.length) {
          const img = images[idx];
          return {
            type: "customImage",
            attrs: { src: img.src, alt: img.alt || null, title: null },
          };
        }
      }
    }
    return node;
  });
  return json;
}

function extractTables(md: string): { md: string; tables: string[] } {
  const tables: string[] = [];
  const lines = md.split("\n");
  const resultLines: string[] = [];
  let tableLines: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) {
      if (!inTable) inTable = true;
      tableLines.push(line);
    } else {
      if (inTable) {
        tables.push(tableLines.join("\n"));
        resultLines.push(`%%TABLE_${tables.length - 1}%%`);
        tableLines = [];
        inTable = false;
      }
      resultLines.push(line);
    }
  }

  if (inTable) {
    tables.push(tableLines.join("\n"));
    resultLines.push(`%%TABLE_${tables.length - 1}%%`);
  }

  return { md: resultLines.join("\n"), tables };
}

function buildTableJSON(tableMd: string): any {
  const lines = tableMd.split("\n");
  const dataLines = lines.filter((l) => !l.trim().match(/^\|[\s\-:]+\|$/));
  if (dataLines.length === 0) return { type: "table", content: [] };

  const rows = dataLines.map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    return cells;
  });

  const content = rows.map((row, rowIdx) => {
    const cells = row.map((cell) => {
      const nodeType = rowIdx === 0 ? "tableHeader" : "tableCell";
      return {
        type: nodeType,
        content: cell
          ? [{ type: "paragraph", content: [{ type: "text", text: cell }] }]
          : [{ type: "paragraph" }],
      };
    });
    return { type: "tableRow", content: cells };
  });

  return { type: "table", content };
}

function replaceTablePlaceholders(json: any, tables: string[]): any {
  if (!json.content) return json;
  json.content = json.content.flatMap((node: any) => {
    if (node.type === "paragraph" && node.content) {
      const fullText = node.content
        .filter((n: any) => n.type === "text")
        .map((n: any) => n.text)
        .join("");
      const match = fullText.match(/^%%TABLE_(\d+)%%$/);
      if (match) {
        const idx = parseInt(match[1]);
        if (idx < tables.length) {
          return buildTableJSON(tables[idx]);
        }
      }
    }
    return node;
  });
  return json;
}

function postprocessTaskItems(json: any): any {
  if (!json.content) return json;

  const newContent: any[] = [];
  for (const node of json.content) {
    if (node.type === "bulletList" && node.content) {
      const allTaskItems = node.content.every(
        (item: any) =>
          item.type === "listItem" &&
          item.content &&
          item.content[0]?.type === "paragraph" &&
          item.content[0]?.content &&
          item.content[0]?.content[0]?.type === "text" &&
          typeof item.content[0]?.content[0]?.text === "string" &&
          /^\[[ xX]\]/.test(item.content[0].content[0].text)
      );

      if (allTaskItems) {
        const taskItems = node.content.map((item: any) => {
          const para = item.content[0];
          const textNode = para.content[0];
          const checked = /^\[[xX]\]/.test(textNode.text);
          const remainingText = textNode.text.replace(/^\[[ xX]\]\s*/, "");
          const newPara = { ...para };
          if (remainingText) {
            newPara.content = [{ type: "text", text: remainingText }];
          } else {
            newPara.content = [];
          }
          const remainingContent = item.content.slice(1) || [];
          return {
            type: "taskItem",
            attrs: { checked },
            content: [newPara, ...remainingContent],
          };
        });
        newContent.push({ type: "taskList", content: taskItems });
      } else {
        newContent.push(node);
      }
    } else {
      newContent.push(node);
    }
  }
  json.content = newContent;
  return json;
}

export function markdownToProseMirrorJSON(md: string): string {
  if (!md.trim()) return '{"type":"doc","content":[]}';
  try {
    const { md: mdWithImagesExtracted, images } = extractImages(md);
    const { md: processedMd, tables } = extractTables(mdWithImagesExtracted);
    const doc = customParser.parse(processedMd);
    const json = doc.toJSON();
    if (json.content) {
      json.content = json.content.map((node: any) => {
        if (node.type === "heading" && node.attrs?.level > 3) {
          return { ...node, attrs: { ...node.attrs, level: 3 } };
        }
        return node;
      });
    }
    replaceImagePlaceholders(json, images);
    replaceTablePlaceholders(json, tables);
    postprocessTaskItems(json);
    const tiptapDoc = Node.fromJSON(tiptapSchema, json);
    return JSON.stringify(tiptapDoc.toJSON());
  } catch (e) {
    return '{"type":"doc","content":[]}';
  }
}

function serializeTableNode(node: any): string {
  const rows = node.content || [];
  if (rows.length === 0) return "";

  const colCount = rows[0]?.content?.length || 0;
  const allCells: string[][] = [];
  for (const row of rows) {
    const cells: string[] = [];
    for (const cell of row.content || []) {
      const text = extractCellText(cell);
      cells.push(text);
    }
    allCells.push(cells);
  }

  const maxWidths: number[] = [];
  for (let c = 0; c < colCount; c++) {
    let maxW = 0;
    for (const row of allCells) {
      if (row[c]) maxW = Math.max(maxW, row[c].length);
    }
    maxWidths.push(Math.max(maxW, 3));
  }

  const lines: string[] = [];
  for (let r = 0; r < allCells.length; r++) {
    const cells = allCells[r];
    const padded = cells.map((c: string, ci: number) => (c || "").padEnd(maxWidths[ci]));
    lines.push("| " + padded.join(" | ") + " |");
    if (r === 0) {
      const sep = maxWidths.map((w: number) => "-".repeat(w));
      lines.push("| " + sep.join(" | ") + " |");
    }
  }
  return lines.join("\n");
}

function extractCellText(cell: any): string {
  if (!cell.content) return "";
  const texts: string[] = [];
  for (const child of cell.content) {
    if (child.type === "paragraph" && child.content) {
      for (const textNode of child.content) {
        if (textNode.type === "text") texts.push(textNode.text);
      }
    } else if (child.type === "text") {
      texts.push(child.text);
    }
  }
  return texts.join("");
}

const customSerializer = new MarkdownSerializer(
  {
    blockquote(state: any, node: any) {
      state.wrapBlock("> ", null, node, () => state.renderContent(node));
    },
    paragraph(state: any, node: any) {
      state.renderInline(node);
      state.closeBlock(node);
    },
    heading(state: any, node: any) {
      state.write(state.repeat("#", node.attrs.level) + " ");
      state.renderInline(node);
      state.closeBlock(node);
    },
    bulletList(state: any, node: any) {
      state.renderList(node, "  ", () => "- ");
    },
    orderedList(state: any, node: any) {
      const start = node.attrs.start || 1;
      state.renderList(node, "  ", (i: number) => `${start + i}. `);
    },
    listItem(state: any, node: any) {
      state.renderContent(node);
    },
    taskList(state: any, node: any) {
      state.renderList(node, "  ", () => "- ");
    },
    taskItem(state: any, node: any) {
      const check = node.attrs.checked ? "x" : " ";
      state.write(`- [${check}] `);
      state.renderContent(node);
    },
    table(state: any, node: any) {
      state.write(serializeTableNode(node.toJSON()));
      state.closeBlock(node);
    },
    tableRow(state: any, node: any) {
      state.renderContent(node);
    },
    tableHeader(state: any, node: any) {
      state.renderInline(node);
    },
    tableCell(state: any, node: any) {
      state.renderInline(node);
    },
    codeBlock(state: any, node: any) {
      state.write("```" + (node.attrs.language || "") + "\n");
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write("```");
      state.closeBlock(node);
    },
    horizontalRule(state: any, node: any) {
      state.write("---");
      state.closeBlock(node);
    },
    customImage(state: any, node: any) {
      state.write("![" + (node.attrs.alt || "") + "](" + node.attrs.src + ")");
      state.closeBlock(node);
    },
    customVideo(state: any, node: any) {
      state.write(`<video src="${node.attrs.src}" controls></video>`);
      state.closeBlock(node);
    },
hardBreak(state: any, node: any) {
      state.write("\\\n");
    },
    text(state: any, node: any) {
      state.text(node.text);
    },
  },
  {
    em: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
    strong: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
    link: {
      open: () => "[",
      close(state: any, mark: any) {
        return "](" + mark.attrs.href + (mark.attrs.title ? " " + mark.attrs.title : "") + ")";
      },
      mixable: true,
    },
    code: { open: "`", close: "`", escape: false },
  },
  { hardBreakNodeName: "hardBreak" }
);

export function proseMirrorJSONToMarkdown(jsonStr: string): string {
  if (!jsonStr.trim()) return "";
  try {
    const parsed = JSON.parse(jsonStr);
    const doc = Node.fromJSON(tiptapSchema, parsed);
    return customSerializer.serialize(doc);
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