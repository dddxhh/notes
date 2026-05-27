import { useState, useCallback, useEffect, useRef } from "react";
import { useUIStore, useTagsStore, useNotesStore } from "../stores";
import { useStorage, useAttachmentUpload, useToast } from "../hooks";
import { revokeAllObjectUrls } from "../lib/attachment-protocol";
import Editor from "./shared/Editor";
import MarkdownEditor from "./shared/MarkdownEditor";
import ModeToggle from "./shared/ModeToggle";
import TagBadge from "./shared/TagBadge";
import TagSelector from "./shared/TagSelector";
import NoteTitleInput from "./shared/NoteTitleInput";
import ContextMenu from "./shared/ContextMenu";
import { markdownToProseMirrorJSON } from "../lib/markdown-serializer";
import { formatDateTime } from "../lib/format-date";
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
  const addTagToStore = useTagsStore((s) => s.addTag);
  const removeNoteFromList = useNotesStore((s) => s.removeNoteFromList);
  const { updateNote, addTagsToNote, removeTagFromNote, createTag, deleteNote, getTagsForNote } =
    useStorage();
  const { uploadFile } = useAttachmentUpload(note.id);
  const { showToast } = useToast();
  const [contentJson, setContentJson] = useState(note.contentJson);
  const [mdText, setMdText] = useState(note.mdText);
  const [title, setTitle] = useState(note.title);
  const [noteTagIds, setNoteTagIds] = useState<string[]>(initialTagIds ?? []);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const noteIdRef = useRef(note.id);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    noteIdRef.current = note.id;
  }, [note.id]);

  useEffect(() => {
    setContentJson(note.contentJson);
    setMdText(note.mdText);
    setTitle(note.title);
    if (initialTagIds) {
      setNoteTagIds(initialTagIds);
    } else {
      getTagsForNote(note.id)
        .then((t) => setNoteTagIds(t.map((tag) => tag.id)))
        .catch(() => {});
    }
  }, [note.id, initialTagIds, getTagsForNote]);

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

  const pendingSaveRef = useRef<{ contentJson: string; mdText: string } | null>(null);
  const originalContentRef = useRef<{ contentJson: string; mdText: string }>({
    contentJson: note.contentJson,
    mdText: note.mdText,
  });

  useEffect(() => {
    originalContentRef.current = { contentJson: note.contentJson, mdText: note.mdText };
  }, [note.id, note.contentJson, note.mdText]);

  const flushSave = useCallback(() => {
    if (pendingSaveRef.current) {
      const { contentJson: cj, mdText: mt } = pendingSaveRef.current;
      const orig = originalContentRef.current;
      if (cj === orig.contentJson && mt === orig.mdText) {
        pendingSaveRef.current = null;
        return;
      }
      const now = Date.now();
      const store = useNotesStore.getState();
      store.updateNoteInList(noteIdRef.current, {
        id: noteIdRef.current,
        contentJson: cj,
        mdText: mt,
        updatedAt: now,
      });
      const currentNote = store.currentNote;
      if (currentNote && currentNote.id === noteIdRef.current) {
        store.setCurrentNote({ ...currentNote, contentJson: cj, mdText: mt, updatedAt: now });
      }
      originalContentRef.current = { contentJson: cj, mdText: mt };
      setSaveStatus("saving");
      const saveStart = Date.now();
      updateNote(noteIdRef.current, { contentJson: cj, mdText: mt })
        .then(() => {
          const elapsed = Date.now() - saveStart;
          const minSpin = Math.max(0, 800 - elapsed);
          setTimeout(() => {
            setSaveStatus("saved");
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
          }, minSpin);
        })
        .catch(() => {
          setSaveStatus("idle");
        });
      pendingSaveRef.current = null;
    }
  }, [updateNote]);

  useEffect(() => {
    pendingSaveRef.current = { contentJson, mdText };
    const timeout = setTimeout(flushSave, 500);
    return () => {
      clearTimeout(timeout);
      flushSave();
    };
  }, [contentJson, mdText, flushSave]);

  const originalTitleRef = useRef(note.title);
  useEffect(() => {
    originalTitleRef.current = note.title;
  }, [note.id, note.title]);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      if (newTitle === originalTitleRef.current) return;
      setTitle(newTitle);
      const now = Date.now();
      const store = useNotesStore.getState();
      store.updateNoteInList(noteIdRef.current, {
        id: noteIdRef.current,
        title: newTitle,
        updatedAt: now,
      });
      const currentNote = store.currentNote;
      if (currentNote && currentNote.id === noteIdRef.current) {
        store.setCurrentNote({ ...currentNote, title: newTitle, updatedAt: now });
      }
      originalTitleRef.current = newTitle;
      setSaveStatus("saving");
      const saveStart = Date.now();
      updateNote(noteIdRef.current, { title: newTitle })
        .then(() => {
          const elapsed = Date.now() - saveStart;
          const minSpin = Math.max(0, 800 - elapsed);
          setTimeout(() => {
            setSaveStatus("saved");
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
          }, minSpin);
        })
        .catch(() => {
          showToast("标题保存失败", "error");
          setSaveStatus("idle");
        });
    },
    [updateNote, showToast],
  );

  const handleAddTag = useCallback(
    async (tagId: string) => {
      if (noteTagIds.includes(tagId)) {
        const newIds = noteTagIds.filter((id) => id !== tagId);
        setNoteTagIds(newIds);
        useNotesStore.getState().updateNoteTags(
          noteIdRef.current,
          tags.filter((t) => newIds.includes(t.id)),
        );
        try {
          await removeTagFromNote(noteIdRef.current, tagId);
        } catch {}
      } else {
        const newIds = [...noteTagIds, tagId];
        setNoteTagIds(newIds);
        useNotesStore.getState().updateNoteTags(
          noteIdRef.current,
          tags.filter((t) => newIds.includes(t.id)),
        );
        try {
          await addTagsToNote(noteIdRef.current, [tagId]);
        } catch {}
      }
    },
    [noteTagIds, addTagsToNote, removeTagFromNote, tags],
  );

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      const newIds = noteTagIds.filter((id) => id !== tagId);
      setNoteTagIds(newIds);
      useNotesStore.getState().updateNoteTags(
        noteIdRef.current,
        tags.filter((t) => newIds.includes(t.id)),
      );
      try {
        await removeTagFromNote(noteIdRef.current, tagId);
      } catch {}
    },
    [noteTagIds, removeTagFromNote, tags],
  );

  const handleCreateTag = useCallback(
    async (name: string) => {
      const tag = await createTag(name);
      addTagToStore(tag);
      const newIds = [...noteTagIds, tag.id];
      setNoteTagIds(newIds);
      useNotesStore
        .getState()
        .updateNoteTags(noteIdRef.current, [...tags.filter((t) => newIds.includes(t.id)), tag]);
      try {
        await addTagsToNote(noteIdRef.current, [tag.id]);
      } catch {}
    },
    [noteTagIds, addTagsToNote, createTag, addTagToStore, tags],
  );

  const noteTags = tags.filter((t) => noteTagIds.includes(t.id));

  const handleContextMenuDelete = useCallback(
    async (id: string) => {
      await deleteNote(id);
      removeNoteFromList(id);
      const store = useNotesStore.getState();
      if (store.currentNote?.id === id) {
        store.setCurrentNote(null);
      }
    },
    [deleteNote, removeNoteFromList],
  );
  const handleContextMenuMoveToFolder = useCallback(
    async (id: string, targetFolderId: string) => {
      await updateNote(id, { folderId: targetFolderId });
      const store = useNotesStore.getState();
      store.updateNoteInList(id, { id, folderId: targetFolderId });
      if (store.currentNote?.id === id) {
        store.setCurrentNote({ ...store.currentNote, folderId: targetFolderId });
      }
    },
    [updateNote],
  );
  const handleContextMenuAddTag = useCallback((_id: string) => {}, []);
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
        <NoteTitleInput value={title} onChange={handleTitleChange} />
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
        <TagSelector
          selectedTagIds={noteTagIds}
          onAdd={handleAddTag}
          onRemove={handleRemoveTag}
          onCreateTag={handleCreateTag}
        />
      </div>

      <ContextMenu
        itemId={note.id}
        itemType="note"
        currentFolderId={note.folderId}
        onDelete={handleContextMenuDelete}
        onMoveToFolder={handleContextMenuMoveToFolder}
        onAddTag={handleContextMenuAddTag}
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
        {formatDateTime(note.updatedAt)} · 自动保存{" "}
        {saveStatus === "saving" ? <span className="save-spinner" /> : <span>✓</span>}
      </div>
    </div>
  );
}
