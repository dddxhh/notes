import { useEffect, useRef, useCallback } from "react";
import { useNotesStore } from "../stores";

export function useAutoSave(
  noteId: string,
  content: { contentJson: string; mdText: string; title: string },
  debounceMs: number = 500
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateNoteInList = useNotesStore((s) => s.updateNoteInList);

  const save = useCallback(async () => {
    updateNoteInList(noteId, {
      ...content,
      id: noteId,
      updatedAt: Date.now(),
    });
  }, [noteId, content, updateNoteInList]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(save, debounceMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [content, debounceMs, save]);
}