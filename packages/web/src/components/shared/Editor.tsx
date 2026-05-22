import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { getEditorExtensions } from "../../lib/tiptap-setup";
import { proseMirrorJSONToMarkdown } from "../../lib/markdown-serializer";
import { useUIStore, useSlashCommandStore } from "../../stores";
import { useAttachmentUpload } from "../../hooks";
import { createAttachmentSrc } from "../../lib/attachment-protocol";
import EditorToolbar from "./EditorToolbar";

interface EditorProps {
  content: string;
  currentNoteId?: string;
  onUpdate: (contentJson: string, mdText: string) => void;
  isMobile?: boolean;
  onFileUpload?: (file: File) => void;
}

export default function Editor({ content, currentNoteId, onUpdate, isMobile, onFileUpload }: EditorProps) {
  const editorMode = useUIStore((s) => s.editorMode);
  const isMobileDefault = useUIStore((s) => s.isMobile);
  const mobile = isMobile ?? isMobileDefault;
  const pendingUpload = useSlashCommandStore((s) => s.pendingUpload);
  const setPendingUpload = useSlashCommandStore((s) => s.setPendingUpload);
  const { uploadFile } = useAttachmentUpload(currentNoteId ?? "");

  const noteIdRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (pendingUpload === "image") {
      imageInputRef.current?.click();
    } else if (pendingUpload === "video") {
      videoInputRef.current?.click();
    }
  }, [pendingUpload]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingUpload(null);
    if (onFileUpload) {
      onFileUpload(file);
      return;
    }
    const result = await uploadFile(file);
    if (result.success && result.attachment && editor) {
      editor.commands.setCustomImage({ src: createAttachmentSrc(result.attachment.id) });
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingUpload(null);
    if (onFileUpload) {
      onFileUpload(file);
      return;
    }
    const result = await uploadFile(file);
    if (result.success && result.attachment && editor) {
      editor.commands.setCustomVideo({ src: createAttachmentSrc(result.attachment.id) });
    }
  };

  if (!editor) return null;

  return (
    <div className="editor-container">
      {!mobile && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoUpload} />
    </div>
  );
}