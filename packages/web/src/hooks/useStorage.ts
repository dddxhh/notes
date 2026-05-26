import { useCallback } from "react";
import { getStorage } from "../lib";
import {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  Folder,
  CreateFolderInput,
  UpdateFolderInput,
  Tag,
  SearchInput,
  SearchResult,
} from "@notes/core";

export function useStorage() {
  const createNote = useCallback(async (input: CreateNoteInput): Promise<Note> => {
    return getStorage().createNote(input);
  }, []);

  const updateNote = useCallback(async (id: string, input: UpdateNoteInput): Promise<Note> => {
    return getStorage().updateNote(id, input);
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    return getStorage().deleteNote(id);
  }, []);

  const getNote = useCallback(async (id: string): Promise<Note | null> => {
    return getStorage().getNote(id);
  }, []);

  const listNotes = useCallback(async (folderId?: string, tagId?: string): Promise<Note[]> => {
    return getStorage().listNotes(folderId, tagId);
  }, []);

  const createFolder = useCallback(async (input: CreateFolderInput): Promise<Folder> => {
    return getStorage().createFolder(input);
  }, []);

  const updateFolder = useCallback(
    async (id: string, input: UpdateFolderInput): Promise<Folder> => {
      return getStorage().updateFolder(id, input);
    },
    [],
  );

  const deleteFolder = useCallback(async (id: string): Promise<void> => {
    return getStorage().deleteFolder(id);
  }, []);

  const listFolders = useCallback(async (parentId?: string | null): Promise<Folder[]> => {
    return getStorage().listFolders(parentId);
  }, []);

  const createTag = useCallback(async (name: string): Promise<Tag> => {
    return getStorage().createTag(name);
  }, []);

  const addTagsToNote = useCallback(async (noteId: string, tagIds: string[]): Promise<void> => {
    return getStorage().addTagsToNote(noteId, tagIds);
  }, []);

  const listTags = useCallback(async (): Promise<Tag[]> => {
    return getStorage().listTags();
  }, []);

  const removeTagFromNote = useCallback(async (noteId: string, tagId: string): Promise<void> => {
    return getStorage().removeTagFromNote(noteId, tagId);
  }, []);

  const removeTagsFromNote = useCallback(
    async (noteId: string, tagIds: string[]): Promise<void> => {
      return getStorage().removeTagsFromNote(noteId, tagIds);
    },
    [],
  );

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    return getStorage().deleteTag(id);
  }, []);

  const getNotesForTag = useCallback(async (tagId: string): Promise<Note[]> => {
    return getStorage().getNotesForTag(tagId);
  }, []);

  const searchNotes = useCallback(async (input: SearchInput): Promise<SearchResult> => {
    return getStorage().searchNotes(input);
  }, []);

  const updateNotesFolderId = useCallback(
    async (oldFolderId: string, newFolderId: string | null): Promise<void> => {
      return getStorage().updateNotesFolderId(oldFolderId, newFolderId);
    },
    [],
  );

  const softDeleteNotesByFolder = useCallback(async (folderId: string): Promise<void> => {
    return getStorage().softDeleteNotesByFolder(folderId);
  }, []);

  const getTagsForNote = useCallback(async (noteId: string): Promise<Tag[]> => {
    return getStorage().getTagsForNote(noteId);
  }, []);

  return {
    createNote,
    updateNote,
    deleteNote,
    getNote,
    listNotes,
    createFolder,
    updateFolder,
    deleteFolder,
    listFolders,
    createTag,
    addTagsToNote,
    listTags,
    removeTagFromNote,
    removeTagsFromNote,
    deleteTag,
    getNotesForTag,
    searchNotes,
    updateNotesFolderId,
    softDeleteNotesByFolder,
    getTagsForNote,
  };
}
