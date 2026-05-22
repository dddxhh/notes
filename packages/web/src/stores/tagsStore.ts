import { create } from "zustand";
import type { Tag } from "@notes/core";

interface TagsState {
  tags: Tag[];
  loading: boolean;
  setTags: (tags: Tag[]) => void;
  addTag: (tag: Tag) => void;
  removeTag: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useTagsStore = create<TagsState>((set) => ({
  tags: [],
  loading: false,
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
  removeTag: (id) => set((state) => ({ tags: state.tags.filter((t) => t.id !== id) })),
  setLoading: (loading) => set({ loading }),
}));