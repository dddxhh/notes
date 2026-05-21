import { create } from "zustand";

interface UIState {
  theme: "light" | "dark";
  editorMode: "wysiwyg" | "markdown";
  sidebarOpen: boolean;
  isMobile: boolean;
  setTheme: (theme: "light" | "dark") => void;
  setEditorMode: (mode: "wysiwyg" | "markdown") => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  editorMode: "wysiwyg",
  sidebarOpen: true,
  isMobile: false,
  setTheme: (theme) => set({ theme }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
}));