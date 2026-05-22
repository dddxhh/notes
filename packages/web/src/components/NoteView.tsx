import { useState, useCallback, useEffect, useRef } from "react";
import { useUIStore } from "../stores";
import { useStorage } from "../hooks";
import Editor from "./shared/Editor";
import MarkdownEditor from "./shared/MarkdownEditor";
import ModeToggle from "./shared/ModeToggle";
import { markdownToProseMirrorJSON, proseMirrorJSONToMarkdown, extractTitleFromContent } from "../lib/markdown-serializer";
import { Note } from "@notes/core";

interface NoteViewProps {
  note: Note;
  onBack?: () => void;
}

export default function NoteView({ note, onBack }: NoteViewProps) {
  const editorMode = useUIStore((s) => s.editorMode);
  const isMobile = useUIStore((s) => s.isMobile);
  const { updateNote } = useStorage();
  const [contentJson, setContentJson] = useState(note.contentJson);
  const [mdText, setMdText] = useState(note.mdText);
  const noteIdRef = useRef(note.id);
  useEffect(() => { noteIdRef.current = note.id; }, [note.id]);

  useEffect(() => {
    setContentJson(note.contentJson);
    setMdText(note.mdText);
  }, [note.id]);

  const handleWysiwygUpdate = useCallback(
    (newJson: string, newMd: string) => {
      setContentJson(newJson);
      setMdText(newMd);
    },
    []
  );

  const handleMarkdownUpdate = useCallback(
    (newMd: string) => {
      setMdText(newMd);
      const newJson = markdownToProseMirrorJSON(newMd);
      setContentJson(newJson);
    },
    []
  );

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const title = extractTitleFromContent(mdText);
      try {
        await updateNote(noteIdRef.current, {
          title: title !== note.title ? title : undefined,
          contentJson,
          mdText,
        });
      } catch {
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [contentJson, mdText, updateNote]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        {isMobile && onBack && (
          <button onClick={onBack} className="px-2 py-1 text-sm text-blue-500 hover:text-blue-700">
            ← 返回
          </button>
        )}
        <h2 className="text-lg font-semibold text-gray-800 truncate">{note.title}</h2>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {editorMode === "wysiwyg" ? (
          <Editor content={contentJson} onUpdate={handleWysiwygUpdate} isMobile={isMobile} />
        ) : (
          <MarkdownEditor content={mdText} onUpdate={handleMarkdownUpdate} />
        )}
      </div>

      <div className="p-2 text-xs text-gray-500 border-t border-gray-200">
        {new Date(note.updatedAt).toLocaleDateString("zh-CN")} · 自动保存 ✓
      </div>
    </div>
  );
}