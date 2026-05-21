import { create } from "zustand";
import { Note } from "@notes/core";

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  searchResult: { notes: { id: string; title: string; updatedAt: number }[]; total: number; hasMore: boolean } | null;
  loading: boolean;
  setNotes: (notes: Note[]) => void;
  setCurrentNote: (note: Note | null) => void;
  addNote: (note: Note) => void;
  updateNoteInList: (id: string, note: Partial<Note> & { id: string }) => void;
  removeNoteFromList: (id: string) => void;
  setSearchResult: (result: { notes: { id: string; title: string; updatedAt: number }[]; total: number; hasMore: boolean } | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  currentNote: null,
  searchResult: null,
  loading: false,
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
    })),
  setSearchResult: (result) => set({ searchResult: result }),
  setLoading: (loading) => set({ loading }),
}));