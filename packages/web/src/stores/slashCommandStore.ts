import { create } from "zustand";

interface SlashCommandState {
  pendingUpload: "image" | "video" | null;
  setPendingUpload: (type: "image" | "video" | null) => void;
}

export const useSlashCommandStore = create<SlashCommandState>((set) => ({
  pendingUpload: null,
  setPendingUpload: (type) => set({ pendingUpload: type }),
}));
