import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { getEditorExtensions } from "../../lib/tiptap-setup";
import { proseMirrorJSONToMarkdown } from "../../lib/markdown-serializer";
import { useUIStore } from "../../stores";
import EditorToolbar from "./EditorToolbar";

interface EditorProps {
  content: string;
  currentNoteId?: string;
  onUpdate: (contentJson: string, mdText: string) => void;
  isMobile?: boolean;
}

export default function Editor({ content, currentNoteId, onUpdate, isMobile }: EditorProps) {
  const editorMode = useUIStore((s) => s.editorMode);
  const isMobileDefault = useUIStore((s) => s.isMobile);
  const mobile = isMobile ?? isMobileDefault;

  const noteIdRef = useRef<string | null>(null);

  const editor = useEditor({
    extensions: getEditorExtensions(mobile),
    content: content || "",
    onUpdate: ({ editor }) => {
      const contentJson = JSON.stringify(editor.getJSON());
      const mdText = proseMirrorJSONToMarkdown(contentJson);
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
    if (editor && content && noteIdRef.current !== currentNoteId) {
      editor.commands.setContent(content);
      noteIdRef.current = currentNoteId ?? null;
    }
  }, [editor, content, currentNoteId]);

  if (!editor) return null;

  return (
    <div className="editor-container">
      {!mobile && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}