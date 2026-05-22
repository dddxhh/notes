import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useToastStore } from "../../src/hooks/useToast";

afterEach(cleanup);

import ToastContainer from "../../src/components/shared/Toast";

describe("ToastContainer", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("renders nothing when no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe("");
  });

  it("renders toast messages", () => {
    useToastStore.getState().addToast("Hello world", "info");
    const { container } = render(<ToastContainer />);
    expect(container.textContent).toContain("Hello world");

    useToastStore.setState({ toasts: [] });
  });

  it("renders multiple toasts", () => {
    useToastStore.getState().addToast("First", "info");
    useToastStore.getState().addToast("Second", "success");
    useToastStore.getState().addToast("Third", "error");
    const { container } = render(<ToastContainer />);
    expect(container.textContent).toContain("First");
    expect(container.textContent).toContain("Second");
    expect(container.textContent).toContain("Third");

    useToastStore.setState({ toasts: [] });
  });

  it("applies type-specific CSS class", () => {
    useToastStore.getState().addToast("Success msg", "success");
    const { container } = render(<ToastContainer />);
    const toastEl = container.querySelector(".toast-success");
    expect(toastEl).toBeTruthy();
    expect(toastEl!.textContent).toContain("Success msg");

    useToastStore.setState({ toasts: [] });
  });

  it("applies toast-error class for error type", () => {
    useToastStore.getState().addToast("Error msg", "error");
    const { container } = render(<ToastContainer />);
    const toastEl = container.querySelector(".toast-error");
    expect(toastEl).toBeTruthy();

    useToastStore.setState({ toasts: [] });
  });

  it("applies toast-info class for info type", () => {
    useToastStore.getState().addToast("Info msg", "info");
    const { container } = render(<ToastContainer />);
    const toastEl = container.querySelector(".toast-info");
    expect(toastEl).toBeTruthy();

    useToastStore.setState({ toasts: [] });
  });

  it("clicking toast calls removeToast", async () => {
    useToastStore.getState().addToast("Dismiss me", "info");
    const state = useToastStore.getState();
    const toastId = state.toasts[0].id;

    const user = userEvent.setup();
    const { container } = render(<ToastContainer />);
    const toastEl = container.querySelector(".toast")!;
    await user.click(toastEl);

    const updated = useToastStore.getState();
    expect(updated.toasts.find((t) => t.id === toastId)).toBeUndefined();
  });
});
