import { create } from "zustand";
import { Note, Tag } from "@notes/core";
import { getStorage } from "../lib/sqlite-init";

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  searchResult: {
    notes: { id: string; title: string; updatedAt: number }[];
    total: number;
    hasMore: boolean;
  } | null;
  loading: boolean;
  deletedNotes: Note[];
  setNotes: (notes: Note[]) => void;
  setCurrentNote: (note: Note | null) => void;
  addNote: (note: Note) => void;
  updateNoteInList: (id: string, note: Partial<Note> & { id: string }) => void;
  removeNoteFromList: (id: string) => void;
  setSearchResult: (
    result: {
      notes: { id: string; title: string; updatedAt: number }[];
      total: number;
      hasMore: boolean;
    } | null,
  ) => void;
  setLoading: (loading: boolean) => void;
  setDeletedNotes: (notes: Note[]) => void;
  loadDeletedNotes: () => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentlyDeleteNote: (id: string) => Promise<void>;
  noteTagsMap: Map<string, Tag[]>;
  setNoteTagsMap: (map: Map<string, Tag[]>) => void;
  updateNoteTags: (noteId: string, tags: Tag[]) => void;
  removeNoteTags: (noteId: string) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  currentNote: null,
  searchResult: null,
  loading: false,
  deletedNotes: [],
  setNotes: (notes) => set({ notes }),
  setCurrentNote: (note) => set({ currentNote: note }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  updateNoteInList: (id, partial) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...partial } : n)),
    })),
  removeNoteFromList: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      currentNote: state.currentNote?.id === id ? null : state.currentNote,
    })),
  setSearchResult: (result) => set({ searchResult: result }),
  setLoading: (loading) => set({ loading }),
  setDeletedNotes: (notes) => set({ deletedNotes: notes }),
  loadDeletedNotes: async () => {
    const storage = getStorage();
    const result = await storage.searchNotes({ includeDeleted: true });
    const allNotes = await storage.listNotes();
    const deleted = allNotes.filter((n) => n.deletedAt !== null);
    const deletedFromSearch: Note[] = [];
    for (const item of result.notes) {
      const full = await storage.getNote(item.id);
      if (full && full.deletedAt !== null) {
        deletedFromSearch.push(full);
      }
    }
    const combined = [
      ...deleted,
      ...deletedFromSearch.filter((n) => !deleted.some((d) => d.id === n.id)),
    ];
    set({ deletedNotes: combined });
  },
  restoreNote: async (id) => {
    const storage = getStorage();
    await storage.updateNote(id, { deletedAt: null });
    const state = get();
    set({ deletedNotes: state.deletedNotes.filter((n) => n.id !== id) });
  },
  permanentlyDeleteNote: async (id) => {
    const storage = getStorage();
    await storage.permanentlyDeleteNote(id);
    const state = get();
    set({ deletedNotes: state.deletedNotes.filter((n) => n.id !== id) });
  },
  noteTagsMap: new Map(),
  setNoteTagsMap: (map) => set({ noteTagsMap: map }),
  updateNoteTags: (noteId, tags) =>
    set((state) => {
      const next = new Map(state.noteTagsMap);
      next.set(noteId, tags);
      return { noteTagsMap: next };
    }),
  removeNoteTags: (noteId) =>
    set((state) => {
      const next = new Map(state.noteTagsMap);
      next.delete(noteId);
      return { noteTagsMap: next };
    }),
}));
