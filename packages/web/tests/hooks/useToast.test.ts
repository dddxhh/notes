import { describe, it, expect } from "vitest";
import { useToastStore } from "../../src/hooks/useToast";

describe("useToastStore", () => {
  it("has correct initial state", () => {
    const state = useToastStore.getState();
    expect(state.toasts).toEqual([]);
  });

  it("addToast appends a toast with id, message, and type", () => {
    useToastStore.getState().addToast("Hello", "success");
    const state = useToastStore.getState();
    expect(state.toasts.length).toBe(1);
    expect(state.toasts[0].message).toBe("Hello");
    expect(state.toasts[0].type).toBe("success");
    expect(state.toasts[0].id).toBeTruthy();

    useToastStore.setState({ toasts: [] });
  });

  it("addToast defaults type to info", () => {
    useToastStore.getState().addToast("Info message");
    const state = useToastStore.getState();
    expect(state.toasts[0].type).toBe("info");

    useToastStore.setState({ toasts: [] });
  });

  it("addToast can add error type", () => {
    useToastStore.getState().addToast("Something failed", "error");
    const state = useToastStore.getState();
    expect(state.toasts[0].type).toBe("error");

    useToastStore.setState({ toasts: [] });
  });

  it("addToast appends multiple toasts", () => {
    useToastStore.getState().addToast("First", "info");
    useToastStore.getState().addToast("Second", "success");
    useToastStore.getState().addToast("Third", "error");
    const state = useToastStore.getState();
    expect(state.toasts.length).toBe(3);
    expect(state.toasts[0].message).toBe("First");
    expect(state.toasts[1].message).toBe("Second");
    expect(state.toasts[2].message).toBe("Third");

    useToastStore.setState({ toasts: [] });
  });

  it("removeToast removes toast by id", () => {
    useToastStore.getState().addToast("Keep", "info");
    useToastStore.getState().addToast("Remove", "error");
    const state = useToastStore.getState();
    const removeId = state.toasts[1].id;
    useToastStore.getState().removeToast(removeId);
    const updated = useToastStore.getState();
    expect(updated.toasts.length).toBe(1);
    expect(updated.toasts[0].message).toBe("Keep");

    useToastStore.setState({ toasts: [] });
  });

  it("removeToast with nonexistent id does not change state", () => {
    useToastStore.getState().addToast("Exists", "info");
    useToastStore.getState().removeToast("nonexistent-id");
    const state = useToastStore.getState();
    expect(state.toasts.length).toBe(1);

    useToastStore.setState({ toasts: [] });
  });
});
