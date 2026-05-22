import { useState, useCallback, useEffect, useRef } from "react";
import { useUIStore, useTagsStore } from "../stores";
import { useStorage, useAttachmentUpload, useToast } from "../hooks";
import { revokeAllObjectUrls } from "../lib/attachment-protocol";
import Editor from "./shared/Editor";
import MarkdownEditor from "./shared/MarkdownEditor";
import ModeToggle from "./shared/ModeToggle";
import TagBadge from "./shared/TagBadge";
import TagSelector from "./shared/TagSelector";
import ContextMenu from "./shared/ContextMenu";
import {
  markdownToProseMirrorJSON,
  proseMirrorJSONToMarkdown,
  extractTitleFromContent,
} from "../lib/markdown-serializer";
import { Note } from "@notes/core";
import type { UploadResult } from "../hooks";

interface NoteViewProps {
  note: Note;
  onBack?: () => void;
  initialTagIds?: string[];
}

export default function NoteView({ note, onBack, initialTagIds }: NoteViewProps) {
  const editorMode = useUIStore((s) => s.editorMode);
  const isMobile = useUIStore((s) => s.isMobile);
  const tags = useTagsStore((s) => s.tags);
  const { updateNote, addTagsToNote, createTag } = useStorage();
  const { uploadFile } = useAttachmentUpload(note.id);
  const { showToast } = useToast();
  const [contentJson, setContentJson] = useState(note.contentJson);
  const [mdText, setMdText] = useState(note.mdText);
  const [noteTagIds, setNoteTagIds] = useState<string[]>(initialTagIds ?? []);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const noteIdRef = useRef(note.id);
  useEffect(() => {
    noteIdRef.current = note.id;
  }, [note.id]);

  useEffect(() => {
    setContentJson(note.contentJson);
    setMdText(note.mdText);
    setNoteTagIds(initialTagIds ?? []);
  }, [note.id, initialTagIds]);

  useEffect(() => {
    return () => revokeAllObjectUrls();
  }, [note.id]);

  const handleFileUpload = useCallback(
    async (file: File): Promise<UploadResult> => {
      const result = await uploadFile(file);
      if (result.success) {
        showToast("附件上传成功", "success");
      } else {
        showToast(result.error || "上传失败", "error");
      }
      return result;
    },
    [uploadFile, showToast],
  );

  const handleWysiwygUpdate = useCallback((newJson: string, newMd: string) => {
    setContentJson(newJson);
    setMdText(newMd);
  }, []);

  const handleMarkdownUpdate = useCallback((newMd: string) => {
    setMdText(newMd);
    const newJson = markdownToProseMirrorJSON(newMd);
    setContentJson(newJson);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const title = extractTitleFromContent(mdText);
      try {
        await updateNote(noteIdRef.current, {
          title: title !== note.title ? title : undefined,
          contentJson,
          mdText,
        });
      } catch {}
    }, 500);
    return () => clearTimeout(timeout);
  }, [contentJson, mdText, updateNote]);

  const handleAddTag = useCallback(
    async (tagId: string) => {
      if (noteTagIds.includes(tagId)) {
        setNoteTagIds((prev) => prev.filter((id) => id !== tagId));
      } else {
        setNoteTagIds((prev) => [...prev, tagId]);
        try {
          await addTagsToNote(noteIdRef.current, [tagId]);
        } catch {}
      }
    },
    [noteTagIds, addTagsToNote],
  );

  const handleRemoveTag = useCallback((tagId: string) => {
    setNoteTagIds((prev) => prev.filter((id) => id !== tagId));
  }, []);

  const handleCreateTag = useCallback(
    async (name: string) => {
      const tag = await createTag(name);
      setNoteTagIds((prev) => [...prev, tag.id]);
      try {
        await addTagsToNote(noteIdRef.current, [tag.id]);
      } catch {}
    },
    [addTagsToNote],
  );

  const noteTags = tags.filter((t) => noteTagIds.includes(t.id));

  const handleContextMenuDelete = useCallback((_id: string) => {}, []);
  const handleContextMenuMoveToFolder = useCallback(
    (_id: string, _targetFolderId: string) => {},
    [],
  );
  const handleContextMenuAddTag = useCallback((_id: string) => {
    setShowTagSelector(true);
  }, []);
  const handleContextMenuRename = useCallback((_id: string, _newName: string) => {}, []);
  const handleContextMenuCopyMarkdown = useCallback(
    (_id: string) => {
      navigator.clipboard.writeText(mdText);
    },
    [mdText],
  );

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between p-2 border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        {isMobile && onBack && (
          <button onClick={onBack} className="px-2 py-1 text-sm" style={{ color: "var(--accent)" }}>
            ← 返回
          </button>
        )}
        <h2 className="text-lg font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {note.title}
        </h2>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-4 py-1 border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        {noteTags.map((tag) => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            removable
            onRemove={() => handleRemoveTag(tag.id)}
          />
        ))}
        <button
          onClick={() => setShowTagSelector(!showTagSelector)}
          className="px-2 py-0.5 text-xs rounded-full"
          style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          添加标签
        </button>
        {showTagSelector && (
          <TagSelector
            selectedTagIds={noteTagIds}
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
            onCreateTag={handleCreateTag}
          />
        )}
      </div>

      <ContextMenu
        itemId={note.id}
        itemType="note"
        currentName={note.title}
        currentFolderId={note.folderId}
        onDelete={handleContextMenuDelete}
        onMoveToFolder={handleContextMenuMoveToFolder}
        onAddTag={handleContextMenuAddTag}
        onRename={handleContextMenuRename}
        onCopyMarkdown={handleContextMenuCopyMarkdown}
      >
        <div className="flex-1 overflow-auto p-4">
          {editorMode === "wysiwyg" ? (
            <Editor
              content={contentJson}
              currentNoteId={note.id}
              onUpdate={handleWysiwygUpdate}
              isMobile={isMobile}
              onFileUpload={handleFileUpload}
            />
          ) : (
            <MarkdownEditor content={mdText} onUpdate={handleMarkdownUpdate} />
          )}
        </div>
      </ContextMenu>

      <div
        className="p-2 text-xs border-t"
        style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}
      >
        {new Date(note.updatedAt).toLocaleDateString("zh-CN")} · 自动保存 ✓
      </div>
    </div>
  );
}
