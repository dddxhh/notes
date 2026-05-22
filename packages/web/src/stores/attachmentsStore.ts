import { create } from "zustand";
import type { Attachment } from "@notes/core";

interface AttachmentsState {
  attachments: Attachment[];
  loading: boolean;
  setAttachments: (attachments: Attachment[]) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useAttachmentsStore = create<AttachmentsState>((set) => ({
  attachments: [],
  loading: false,
  setAttachments: (attachments) => set({ attachments }),
  addAttachment: (attachment) =>
    set((state) => ({ attachments: [...state.attachments, attachment] })),
  removeAttachment: (id) =>
    set((state) => ({ attachments: state.attachments.filter((a) => a.id !== id) })),
  setLoading: (loading) => set({ loading }),
}));
