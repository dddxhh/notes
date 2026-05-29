import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { CustomImage } from "./CustomImage";
import { CustomVideo } from "./CustomVideo";
import { SlashCommand } from "./SlashCommandExtension";
import { lowlight } from "./highlight-languages";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";

export function getEditorExtensions(isMobile: boolean) {
  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
      codeBlock: false,
      horizontalRule: false,
    }),
    Placeholder.configure({
      placeholder: isMobile ? "开始记录..." : "想写点什么？",
    }),
    CharacterCount,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    CodeBlockLowlight.configure({
      lowlight,
    }),
    HorizontalRule,
    CustomImage,
    CustomVideo,
    SlashCommand,
  ];
  return extensions;
}

export { Collaboration, CollaborationCursor };
