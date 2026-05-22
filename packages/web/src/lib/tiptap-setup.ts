import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";

export function getEditorExtensions(isMobile: boolean) {
  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: { keepMarks: true },
      orderedList: { keepMarks: true },
    }),
    Placeholder.configure({
      placeholder: isMobile ? "开始记录..." : "想写点什么？",
    }),
    CharacterCount,
  ];
  return extensions;
}