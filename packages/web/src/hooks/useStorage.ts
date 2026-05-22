import { useCallback } from "react";
import { getStorage } from "../lib";
import {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  Folder,
  CreateFolderInput,
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

  const searchNotes = useCallback(async (input: SearchInput): Promise<SearchResult> => {
    return getStorage().searchNotes(input);
  }, []);

  return {
    createNote,
    updateNote,
    deleteNote,
    getNote,
    listNotes,
    createFolder,
    listFolders,
    createTag,
    addTagsToNote,
    listTags,
    searchNotes,
  };
}
