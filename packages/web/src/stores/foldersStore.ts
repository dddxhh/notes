import { create } from "zustand";
import { Folder } from "@notes/core";

interface FoldersState {
  folders: Folder[];
  currentFolderId: string | null;
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  removeFolder: (id: string) => void;
  setCurrentFolderId: (id: string | null) => void;
}

export const useFoldersStore = create<FoldersState>((set) => ({
  folders: [],
  currentFolderId: null,
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ folders: [...state.folders, folder] })),
  removeFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
    })),
  setCurrentFolderId: (id) => set({ currentFolderId: id }),
}));