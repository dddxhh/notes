import { create } from "zustand";
import type { Tag } from "@notes/core";

interface TagsState {
  tags: Tag[];
  loading: boolean;
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  updateTagInList: (id: string, partial: Partial<Tag> & { id: string }) => void;
  removeTag: (id: string) => void;
  deleteTag: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useTagsStore = create<TagsState>((set) => ({
  tags: [],
  loading: false,
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
  updateTagInList: (id, partial) =>
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    })),
  removeTag: (id) => set((state) => ({ tags: state.tags.filter((t) => t.id !== id) })),
  deleteTag: (id) => set((state) => ({ tags: state.tags.filter((t) => t.id !== id) })),
  setLoading: (loading) => set({ loading }),
}));
