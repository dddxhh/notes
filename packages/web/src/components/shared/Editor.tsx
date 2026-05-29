import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useRef, useMemo } from "react";
import { getEditorExtensions, Collaboration, CollaborationCursor } from "../../lib/tiptap-setup";
import { useSyncStore } from "../../stores/syncStore";
import { useAuthStore } from "../../stores/authStore";
import { proseMirrorJSONToMarkdown } from "../../lib/markdown-serializer";
import { useUIStore, useSlashCommandStore } from "../../stores";
import { useAttachmentUpload, type UploadResult } from "../../hooks";
import { createAttachmentSrc } from "../../lib/attachment-protocol";
import type { Attachment } from "@notes/core";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
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
  const isMobileDefault = useUIStore((s) => s.isMobile);
  const mobile = isMobile ?? isMobileDefault;
  const pendingUpload = useSlashCommandStore((s) => s.pendingUpload);
  const setPendingUpload = useSlashCommandStore((s) => s.setPendingUpload);
  const { uploadFile } = useAttachmentUpload(currentNoteId ?? "");

  const isSyncEnabled = useSyncStore((s) => s.engine !== null);
  const getNoteDoc = useSyncStore((s) => s.getNoteDoc);

  const yjsDoc = useMemo(
    () => (isSyncEnabled && currentNoteId ? getNoteDoc(currentNoteId) : null),
    [isSyncEnabled, currentNoteId, getNoteDoc],
  );
  const yjsXmlFragment = useMemo(
    () => (yjsDoc ? yjsDoc.getXmlFragment("contentJson") : null),
    [yjsDoc],
  );

  const onUpdateRef = useRef(onUpdate);
  const yjsDocRef = useRef(yjsDoc);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    yjsDocRef.current = yjsDoc;
  }, [yjsDoc]);

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
    extensions: useMemo(() => {
      const base = getEditorExtensions(mobile);
      if (yjsXmlFragment) {
        const provider = useSyncStore.getState().engine?.getProvider(currentNoteId!);
        return [
          ...base,
          Collaboration.configure({ fragment: yjsXmlFragment }),
          ...(provider
            ? [
                CollaborationCursor.configure({
                  provider,
                  user: {
                    name: useAuthStore.getState().user?.username || "Anonymous",
                    color: "#3b82f6",
                  },
                }),
              ]
            : []),
        ];
      }
      return base;
    }, [mobile, yjsXmlFragment, currentNoteId]),
    content: yjsXmlFragment ? undefined : parsedContent || "",
    onUpdate: ({ editor }) => {
      const contentJson = JSON.stringify(editor.getJSON());
      const mdText = proseMirrorJSONToMarkdown(contentJson);

      const currentYjsDoc = yjsDocRef.current;
      if (currentYjsDoc) {
        const yMdText = currentYjsDoc.getText("mdText");
        currentYjsDoc.transact(() => {
          yMdText.delete(0, yMdText.length);
          yMdText.insert(0, mdText);
        });
      }

      onUpdateRef.current(contentJson, mdText);
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
    if (!editor || noteIdRef.current === currentNoteId) return;
    noteIdRef.current = currentNoteId ?? null;

    if (yjsXmlFragment) {
      if (yjsXmlFragment.length === 0 && parsedContent) {
        try {
          const schema = editor.view.state.schema;
          prosemirrorJSONToYXmlFragment(schema, parsedContent, yjsXmlFragment);
        } catch (e) {
          console.warn("Failed to init Yjs doc from local content:", e);
        }
      }
    } else {
      editor.commands.setContent(parsedContent || "");
    }
  }, [editor, parsedContent, currentNoteId, yjsXmlFragment]);

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
