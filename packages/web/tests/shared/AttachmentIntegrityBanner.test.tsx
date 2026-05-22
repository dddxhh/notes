import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import AttachmentIntegrityBanner from "../../src/components/shared/AttachmentIntegrityBanner";

describe("AttachmentIntegrityBanner", () => {
  it("renders nothing when missingAttachments is empty", () => {
    const { container } = render(
      <AttachmentIntegrityBanner missingAttachments={[]} onDismiss={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders warning banner when attachments are missing", () => {
    const { container } = render(
      <AttachmentIntegrityBanner missingAttachments={["att1", "att2"]} onDismiss={vi.fn()} />,
    );
    expect(container.textContent).toContain("2");
    expect(container.textContent).toContain("附件文件丢失");
  });

  it("renders correct count for single missing attachment", () => {
    const { container } = render(
      <AttachmentIntegrityBanner missingAttachments={["att1"]} onDismiss={vi.fn()} />,
    );
    expect(container.textContent).toContain("1");
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(
      <AttachmentIntegrityBanner missingAttachments={["att1", "att2"]} onDismiss={onDismiss} />,
    );
    const dismissBtn = document.querySelector(".integrity-banner-dismiss");
    expect(dismissBtn).toBeTruthy();
    await user.click(dismissBtn!);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("uses integrity-banner CSS class", () => {
    const { container } = render(
      <AttachmentIntegrityBanner missingAttachments={["att1"]} onDismiss={vi.fn()} />,
    );
    const banner = container.querySelector(".integrity-banner");
    expect(banner).toBeTruthy();
  });
});
