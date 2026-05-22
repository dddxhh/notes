import { create } from "zustand";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = "info") =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  const removeToast = useToastStore((s) => s.removeToast);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = crypto.randomUUID();
    addToast(message, type);
    setTimeout(() => removeToast(id), 3000);
  };

  return { showToast };
}
