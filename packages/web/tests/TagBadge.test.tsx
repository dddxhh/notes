import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

afterEach(cleanup);

import TagBadge from "../src/components/shared/TagBadge";

describe("TagBadge", () => {
  it("renders tag name", () => {
    const { container } = render(<TagBadge name="work" />);
    expect(container.textContent).toContain("#work");
  });

  it("applies correct styling", () => {
    const { container } = render(<TagBadge name="test" />);
    const badge = container.querySelector("span");
    expect(badge).toBeTruthy();
    expect(badge!.className).toContain("rounded-full");
    expect(badge!.className).toContain("bg-blue-100");
    expect(badge!.className).toContain("text-blue-700");
  });
});