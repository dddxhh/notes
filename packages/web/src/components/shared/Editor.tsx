import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef, useMemo } from "react";
import { getEditorExtensions } from "../../lib/tiptap-setup";
import { proseMirrorJSONToMarkdown } from "../../lib/markdown-serializer";
import { useUIStore, useSlashCommandStore } from "../../stores";
import { useAttachmentUpload, type UploadResult } from "../../hooks";
import { createAttachmentSrc } from "../../lib/attachment-protocol";
import type { Attachment } from "@notes/core";
import EditorToolbar from "./EditorToolbar";

interface EditorProps {
  content: string;
  currentNoteId?: string;
  onUpdate: (contentJson: string, mdText: string) => void;
  isMobile?: boolean;
  onFileUpload?: (file: File) => Promise<UploadResult | undefined>;
}

export default function Editor({
  content,
  currentNoteId,
  onUpdate,
  isMobile,
  onFileUpload,
}: EditorProps) {
  const editorMode = useUIStore((s) => s.editorMode);
  const isMobileDefault = useUIStore((s) => s.isMobile);
  const mobile = isMobile ?? isMobileDefault;
  const pendingUpload = useSlashCommandStore((s) => s.pendingUpload);
  const setPendingUpload = useSlashCommandStore((s) => s.setPendingUpload);
  const { uploadFile } = useAttachmentUpload(currentNoteId ?? "");

  const noteIdRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const insertAttachmentNode = (attachment: Attachment, file: File) => {
    if (!editor) return;
    const src = createAttachmentSrc(attachment.id);
    if (attachment.type === "image" || file.type.startsWith("image/")) {
      editor.commands.setCustomImage({ src });
    } else if (attachment.type === "video" || file.type.startsWith("video/")) {
      editor.commands.setCustomVideo({ src });
    }
  };

  const handleFilesFromTransfer = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (onFileUpload) {
        const result = await onFileUpload(file);
        if (result?.success && result?.attachment) {
          insertAttachmentNode(result.attachment, file);
        }
      } else {
        const result = await uploadFile(file);
        if (result.success && result.attachment) {
          insertAttachmentNode(result.attachment, file);
        }
      }
    }
  };

  const parsedContent = useMemo(() => {
    if (!content) return "";
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }, [content]);

  const editor = useEditor({
    extensions: getEditorExtensions(mobile),
    content: parsedContent || "",
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
      handleDrop: (_view: any, event: any, _slice: any, _moved: boolean) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        event.preventDefault();
        handleFilesFromTransfer(files);
        return true;
      },
      handlePaste: (_view: any, event: any, _slice: any) => {
        const files = event.clipboardData?.files;
        if (!files || files.length === 0) return false;
        event.preventDefault();
        handleFilesFromTransfer(files);
        return true;
      },
    },
  });

  useEffect(() => {
    if (editor && parsedContent && noteIdRef.current !== currentNoteId) {
      editor.commands.setContent(parsedContent);
      noteIdRef.current = currentNoteId ?? null;
    }
  }, [editor, parsedContent, currentNoteId]);

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
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={handleVideoUpload}
      />
    </div>
  );
}
