import { describe, it, expect } from "vitest";
import { useSlashCommandStore } from "../../src/stores/slashCommandStore";

describe("useSlashCommandStore", () => {
  it("has correct initial state", () => {
    const state = useSlashCommandStore.getState();
    expect(state.pendingUpload).toBeNull();
  });

  it("setPendingUpload sets pendingUpload to image", () => {
    useSlashCommandStore.getState().setPendingUpload("image");
    const state = useSlashCommandStore.getState();
    expect(state.pendingUpload).toBe("image");

    useSlashCommandStore.setState({ pendingUpload: null });
  });

  it("setPendingUpload sets pendingUpload to video", () => {
    useSlashCommandStore.getState().setPendingUpload("video");
    const state = useSlashCommandStore.getState();
    expect(state.pendingUpload).toBe("video");

    useSlashCommandStore.setState({ pendingUpload: null });
  });

  it("setPendingUpload clears pendingUpload when set to null", () => {
    useSlashCommandStore.getState().setPendingUpload("image");
    useSlashCommandStore.getState().setPendingUpload(null);
    const state = useSlashCommandStore.getState();
    expect(state.pendingUpload).toBeNull();
  });
});
