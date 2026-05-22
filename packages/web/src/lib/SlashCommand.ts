import type { SlashCommandItem } from "../components/shared/SlashCommandPanel";
import { useSlashCommandStore } from "../stores/slashCommandStore";

export const SlashCommandItems: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large heading",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium heading",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small heading",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a bullet list",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a numbered list",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Code Block",
    description: "Insert code block",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Blockquote",
    description: "Insert blockquote",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Horizontal Rule",
    description: "Insert horizontal rule",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Image",
    description: "Insert image from file",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      useSlashCommandStore.getState().setPendingUpload("image");
    },
  },
  {
    title: "Video",
    description: "Insert video from file",
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      useSlashCommandStore.getState().setPendingUpload("video");
    },
  },
];

export function filterItems({ query }: { query: string }): SlashCommandItem[] {
  if (!query) return SlashCommandItems;
  return SlashCommandItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );
}