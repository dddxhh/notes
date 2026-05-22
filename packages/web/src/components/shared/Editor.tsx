import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import { getEditorExtensions } from "../../lib/tiptap-setup";
import { useUIStore } from "../../stores";
import EditorToolbar from "./EditorToolbar";

interface EditorProps {
  content: string;
  onUpdate: (contentJson: string, mdText: string) => void;
  isMobile?: boolean;
}

export default function Editor({ content, onUpdate, isMobile }: EditorProps) {
  const editorMode = useUIStore((s) => s.editorMode);
  const isMobileDefault = useUIStore((s) => s.isMobile);
  const mobile = isMobile ?? isMobileDefault;

  const editor = useEditor({
    extensions: getEditorExtensions(mobile),
    content: content || "",
    onUpdate: ({ editor }) => {
      const contentJson = JSON.stringify(editor.getJSON());
      const mdText = editor.getText();
      onUpdate(contentJson, mdText);
    },
    editorProps: {
      attributes: {
        class: mobile
          ? "prose prose-sm max-w-none focus:outline-none min-h-[200px]"
          : "prose prose-lg max-w-none focus:outline-none min-h-[300px]",
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON());
      if (currentContent !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className="editor-container">
      {!mobile && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}