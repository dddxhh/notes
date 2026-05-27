import { create } from "zustand";

function getInitialTheme(): "light" | "dark" {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

interface UIState {
  theme: "light" | "dark";
  editorMode: "wysiwyg" | "markdown";
  sidebarOpen: boolean;
  isMobile: boolean;
  showTrash: boolean;
  setTheme: (theme: "light" | "dark") => void;
  setEditorMode: (mode: "wysiwyg" | "markdown") => void;
  setSidebarOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  setShowTrash: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: getInitialTheme(),
  editorMode: "wysiwyg",
  sidebarOpen: true,
  isMobile: false,
  showTrash: false,
  setTheme: (theme) => set({ theme }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  setShowTrash: (show) => set({ showTrash: show }),
}));
