import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import TagBadge from "../../src/components/shared/TagBadge";

describe("TagBadge", () => {
  it("renders tag name", () => {
    render(<TagBadge name="work" />);
    expect(screen.getByText("#work")).toBeTruthy();
  });

  it("applies correct styling", () => {
    render(<TagBadge name="test" />);
    const badge = screen.getByText("#test");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("bg-blue-100");
    expect(badge.className).toContain("text-blue-700");
  });
});