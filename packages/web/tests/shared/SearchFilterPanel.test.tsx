import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tag, SearchInput } from "@notes/core";

afterEach(cleanup);

import SearchFilterPanel from "../../src/components/shared/SearchFilterPanel";

describe("SearchFilterPanel", () => {
  const mockTags: Tag[] = [
    { id: "t1", name: "important" },
    { id: "t2", name: "draft" },
  ];
  const mockOnFilterChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders tag selector section", () => {
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel tags={mockTags} filter={filter} onFilterChange={mockOnFilterChange} />,
    );
    expect(screen.getByText("标签筛选")).toBeTruthy();
    expect(screen.getByText("important")).toBeTruthy();
    expect(screen.getByText("draft")).toBeTruthy();
  });

  it("renders time range section", () => {
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel tags={mockTags} filter={filter} onFilterChange={mockOnFilterChange} />,
    );
    expect(screen.getByText("时间范围")).toBeTruthy();
  });

  it("clicking a tag checkbox calls onFilterChange with tagIds", async () => {
    const user = userEvent.setup();
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel tags={mockTags} filter={filter} onFilterChange={mockOnFilterChange} />,
    );
    await user.click(screen.getByText("important"));
    expect(mockOnFilterChange).toHaveBeenCalledWith({ tagIds: ["t1"], tagMode: "union" });
  });

  it("time range date inputs call onFilterChange with dateRange", async () => {
    const user = userEvent.setup();
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel tags={mockTags} filter={filter} onFilterChange={mockOnFilterChange} />,
    );
    const fromInput = screen.getByLabelText("起始日期");
    await user.type(fromInput, "2025-01-01");
    expect(mockOnFilterChange).toHaveBeenCalled();
    const lastCall = mockOnFilterChange.mock.calls[mockOnFilterChange.mock.calls.length - 1][0];
    expect(lastCall.dateRange).toBeDefined();
    expect(lastCall.dateRange.field).toBe("updated_at");
  });

  it("tag mode toggle switches between intersection and union", async () => {
    const user = userEvent.setup();
    const filter: SearchInput = { tagIds: ["t1"], tagMode: "union" };
    render(
      <SearchFilterPanel tags={mockTags} filter={filter} onFilterChange={mockOnFilterChange} />,
    );
    await user.click(screen.getByText("并集"));
    expect(mockOnFilterChange).toHaveBeenCalledWith({ tagMode: "intersection", tagIds: ["t1"] });
  });
});
