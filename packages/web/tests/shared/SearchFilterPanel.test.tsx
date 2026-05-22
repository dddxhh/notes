import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Folder, Tag, SearchInput } from "@notes/core";

afterEach(cleanup);

import SearchFilterPanel from "../../src/components/shared/SearchFilterPanel";

describe("SearchFilterPanel", () => {
  const mockFolders: Folder[] = [
    {
      id: "f1",
      name: "Work",
      parentId: null,
      sortOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "f2",
      name: "Personal",
      parentId: null,
      sortOrder: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  const mockTags: Tag[] = [
    { id: "t1", name: "important" },
    { id: "t2", name: "draft" },
  ];
  const mockOnFilterChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders folder dropdown with folder list", () => {
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel
        folders={mockFolders}
        tags={mockTags}
        filter={filter}
        onFilterChange={mockOnFilterChange}
      />,
    );
    expect(screen.getByLabelText("文件夹")).toBeTruthy();
    expect(screen.getByText("Work")).toBeTruthy();
    expect(screen.getByText("Personal")).toBeTruthy();
  });

  it("renders tag selector section", () => {
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel
        folders={mockFolders}
        tags={mockTags}
        filter={filter}
        onFilterChange={mockOnFilterChange}
      />,
    );
    expect(screen.getByText("标签筛选")).toBeTruthy();
    expect(screen.getByText("important")).toBeTruthy();
    expect(screen.getByText("draft")).toBeTruthy();
  });

  it("renders time range section", () => {
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel
        folders={mockFolders}
        tags={mockTags}
        filter={filter}
        onFilterChange={mockOnFilterChange}
      />,
    );
    expect(screen.getByText("时间范围")).toBeTruthy();
  });

  it("selecting a folder calls onFilterChange with folderId", async () => {
    const user = userEvent.setup();
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel
        folders={mockFolders}
        tags={mockTags}
        filter={filter}
        onFilterChange={mockOnFilterChange}
      />,
    );
    const select = screen.getByLabelText("文件夹");
    await user.selectOptions(select, "f1");
    expect(mockOnFilterChange).toHaveBeenCalledWith({ folderId: "f1" });
  });

  it("clicking a tag checkbox calls onFilterChange with tagIds", async () => {
    const user = userEvent.setup();
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel
        folders={mockFolders}
        tags={mockTags}
        filter={filter}
        onFilterChange={mockOnFilterChange}
      />,
    );
    await user.click(screen.getByText("important"));
    expect(mockOnFilterChange).toHaveBeenCalledWith({ tagIds: ["t1"], tagMode: "union" });
  });

  it("time range date inputs call onFilterChange with dateRange", async () => {
    const user = userEvent.setup();
    const filter: SearchInput = {};
    render(
      <SearchFilterPanel
        folders={mockFolders}
        tags={mockTags}
        filter={filter}
        onFilterChange={mockOnFilterChange}
      />,
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
      <SearchFilterPanel
        folders={mockFolders}
        tags={mockTags}
        filter={filter}
        onFilterChange={mockOnFilterChange}
      />,
    );
    await user.click(screen.getByText("并集"));
    expect(mockOnFilterChange).toHaveBeenCalledWith({ tagMode: "intersection", tagIds: ["t1"] });
  });
});
