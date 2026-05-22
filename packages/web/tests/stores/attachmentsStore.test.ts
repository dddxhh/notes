import { describe, it, expect } from "vitest";
import type { Attachment } from "@notes/core";
import { useAttachmentsStore } from "../../src/stores/attachmentsStore";

const mockAttachment1: Attachment = {
  id: "id1",
  noteId: "note1",
  type: "image",
  filename: "photo.jpg",
  mimeType: "image/jpeg",
  size: 1024,
  createdAt: 1000,
};

const mockAttachment2: Attachment = {
  id: "id2",
  noteId: "note1",
  type: "file",
  filename: "doc.pdf",
  mimeType: "application/pdf",
  size: 2048,
  createdAt: 2000,
};

const mockAttachment3: Attachment = {
  id: "id3",
  noteId: "note2",
  type: "video",
  filename: "clip.mp4",
  mimeType: "video/mp4",
  size: 4096,
  createdAt: 3000,
};

describe("useAttachmentsStore", () => {
  it("has correct initial state", () => {
    const state = useAttachmentsStore.getState();
    expect(state.attachments).toEqual([]);
    expect(state.loading).toBe(false);
  });

  it("setAttachments replaces the attachments list", () => {
    useAttachmentsStore.getState().setAttachments([mockAttachment1, mockAttachment2]);
    const state = useAttachmentsStore.getState();
    expect(state.attachments).toEqual([mockAttachment1, mockAttachment2]);

    useAttachmentsStore.setState({ attachments: [], loading: false });
  });

  it("addAttachment appends to existing list", () => {
    useAttachmentsStore.getState().setAttachments([mockAttachment1, mockAttachment2]);
    useAttachmentsStore.getState().addAttachment(mockAttachment3);
    const state = useAttachmentsStore.getState();
    expect(state.attachments).toEqual([mockAttachment1, mockAttachment2, mockAttachment3]);

    useAttachmentsStore.setState({ attachments: [], loading: false });
  });

  it("removeAttachment filters out the attachment with matching id", () => {
    useAttachmentsStore
      .getState()
      .setAttachments([mockAttachment1, mockAttachment2, mockAttachment3]);
    useAttachmentsStore.getState().removeAttachment("id1");
    const state = useAttachmentsStore.getState();
    expect(state.attachments).toEqual([mockAttachment2, mockAttachment3]);

    useAttachmentsStore.setState({ attachments: [], loading: false });
  });

  it("removeAttachment with nonexistent id does not change state", () => {
    useAttachmentsStore.getState().setAttachments([mockAttachment1, mockAttachment2]);
    useAttachmentsStore.getState().removeAttachment("nonexistent");
    const state = useAttachmentsStore.getState();
    expect(state.attachments).toEqual([mockAttachment1, mockAttachment2]);

    useAttachmentsStore.setState({ attachments: [], loading: false });
  });

  it("setLoading sets loading to true", () => {
    useAttachmentsStore.getState().setLoading(true);
    const state = useAttachmentsStore.getState();
    expect(state.loading).toBe(true);

    useAttachmentsStore.setState({ attachments: [], loading: false });
  });

  it("setLoading sets loading to false", () => {
    useAttachmentsStore.setState({ loading: true });
    useAttachmentsStore.getState().setLoading(false);
    const state = useAttachmentsStore.getState();
    expect(state.loading).toBe(false);

    useAttachmentsStore.setState({ attachments: [], loading: false });
  });
});
