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
  UpdateTagInput,
  SearchInput,
  SearchResult,
  DataDump,
} from "@notes/core";
import { useSyncStore } from "../stores/syncStore";
import {
  pushNote,
  pushFolder,
  pushTag,
  pushDeleteNote,
  pushDeleteFolder,
  pushDeleteTag,
  pushNoteTags,
  pushQueue,
  isPullingFromRemote,
} from "../lib/sync-metadata";

export function useStorage() {
  const createNote = useCallback(async (input: CreateNoteInput): Promise<Note> => {
    const note = await getStorage().createNote(input);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      pushNote(note).catch(() => {
        pushQueue.enqueue({ type: "note", data: note, entityId: note.id });
      });
    }
    return note;
  }, []);

  const updateNote = useCallback(async (id: string, input: UpdateNoteInput): Promise<Note> => {
    const note = await getStorage().updateNote(id, input);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      pushNote(note).catch(() => {
        pushQueue.enqueue({ type: "note", data: note, entityId: note.id });
      });
    }
    return note;
  }, []);

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    await getStorage().deleteNote(id);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      pushDeleteNote(id).catch(() => {
        pushQueue.enqueue({ type: "deleteNote", data: id, entityId: id });
      });
    }
  }, []);

  const getNote = useCallback(async (id: string): Promise<Note | null> => {
    return getStorage().getNote(id);
  }, []);

  const listNotes = useCallback(async (folderId?: string, tagId?: string): Promise<Note[]> => {
    return getStorage().listNotes(folderId, tagId);
  }, []);

  const createFolder = useCallback(async (input: CreateFolderInput): Promise<Folder> => {
    const folder = await getStorage().createFolder(input);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      pushFolder(folder).catch(() => {
        pushQueue.enqueue({ type: "folder", data: folder, entityId: folder.id });
      });
    }
    return folder;
  }, []);

  const updateFolder = useCallback(
    async (id: string, input: UpdateFolderInput): Promise<Folder> => {
      const folder = await getStorage().updateFolder(id, input);
      if (useSyncStore.getState().engine && !isPullingFromRemote()) {
        pushFolder(folder).catch(() => {
          pushQueue.enqueue({ type: "folder", data: folder, entityId: folder.id });
        });
      }
      return folder;
    },
    [],
  );

  const deleteFolder = useCallback(async (id: string): Promise<void> => {
    await getStorage().deleteFolder(id);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      pushDeleteFolder(id).catch(() => {
        pushQueue.enqueue({ type: "deleteFolder", data: id, entityId: id });
      });
    }
  }, []);

  const listFolders = useCallback(async (parentId?: string | null): Promise<Folder[]> => {
    return getStorage().listFolders(parentId);
  }, []);

  const createTag = useCallback(async (name: string): Promise<Tag> => {
    const tag = await getStorage().createTag(name);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      pushTag(tag).catch(() => {
        pushQueue.enqueue({ type: "tag", data: tag, entityId: tag.id });
      });
    }
    return tag;
  }, []);

  const updateTag = useCallback(async (id: string, input: UpdateTagInput): Promise<Tag> => {
    return getStorage().updateTag(id, input);
  }, []);

  const addTagsToNote = useCallback(async (noteId: string, tagIds: string[]): Promise<void> => {
    await getStorage().addTagsToNote(noteId, tagIds);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      const allTags = await getStorage().getTagsForNote(noteId);
      pushNoteTags(
        noteId,
        allTags.map((t) => t.id),
      ).catch(() => {
        pushQueue.enqueue({
          type: "noteTags",
          data: allTags.map((t) => ({ noteId, tagId: t.id })),
          entityId: noteId,
        });
      });
    }
  }, []);

  const listTags = useCallback(async (): Promise<Tag[]> => {
    return getStorage().listTags();
  }, []);

  const removeTagFromNote = useCallback(async (noteId: string, tagId: string): Promise<void> => {
    await getStorage().removeTagFromNote(noteId, tagId);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      const allTags = await getStorage().getTagsForNote(noteId);
      pushNoteTags(
        noteId,
        allTags.map((t) => t.id),
      ).catch(() => {
        pushQueue.enqueue({
          type: "noteTags",
          data: allTags.map((t) => ({ noteId, tagId: t.id })),
          entityId: noteId,
        });
      });
    }
  }, []);

  const removeTagsFromNote = useCallback(
    async (noteId: string, tagIds: string[]): Promise<void> => {
      return getStorage().removeTagsFromNote(noteId, tagIds);
    },
    [],
  );

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    await getStorage().deleteTag(id);
    if (useSyncStore.getState().engine && !isPullingFromRemote()) {
      pushDeleteTag(id).catch(() => {
        pushQueue.enqueue({ type: "deleteTag", data: id, entityId: id });
      });
    }
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

  const dumpAll = useCallback(async (): Promise<DataDump> => {
    return getStorage().dumpAll();
  }, []);

  const restoreAll = useCallback(async (dump: DataDump): Promise<void> => {
    return getStorage().restoreAll(dump);
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
    updateTag,
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
    dumpAll,
    restoreAll,
  };
}
