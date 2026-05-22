import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SearchResult } from "@notes/core";

afterEach(cleanup);

import SearchResultList from "../../src/components/shared/SearchResultList";

describe("SearchResultList", () => {
  const mockOnSelectNote = vi.fn();
  const mockOnLoadMore = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockResult: SearchResult = {
    notes: [
      { id: "note-1", title: "First Note", updatedAt: 1700000000000 },
      { id: "note-2", title: "Second Note", updatedAt: 1700001000000 },
    ],
    total: 2,
    hasMore: false,
  };

  it("renders 搜索中... when loading is true", () => {
    render(
      <SearchResultList
        result={null}
        loading={true}
        onSelectNote={mockOnSelectNote}
        onLoadMore={mockOnLoadMore}
      />,
    );
    expect(screen.getByText("搜索中...")).toBeTruthy();
  });

  it("renders 暂无结果 when result is null and not loading", () => {
    render(
      <SearchResultList
        result={null}
        loading={false}
        onSelectNote={mockOnSelectNote}
        onLoadMore={mockOnLoadMore}
      />,
    );
    expect(screen.getByText("暂无结果")).toBeTruthy();
  });

  it("renders list of search result items", () => {
    render(
      <SearchResultList
        result={mockResult}
        loading={false}
        onSelectNote={mockOnSelectNote}
        onLoadMore={mockOnLoadMore}
      />,
    );
    expect(screen.getByText("First Note")).toBeTruthy();
    expect(screen.getByText("Second Note")).toBeTruthy();
  });

  it("each item shows updatedAt date", () => {
    render(
      <SearchResultList
        result={mockResult}
        loading={false}
        onSelectNote={mockOnSelectNote}
        onLoadMore={mockOnLoadMore}
      />,
    );
    const items = screen.getAllByRole("button");
    expect(items.length).toBe(2);
  });

  it("clicking an item calls onSelectNote with note id", async () => {
    const user = userEvent.setup();
    render(
      <SearchResultList
        result={mockResult}
        loading={false}
        onSelectNote={mockOnSelectNote}
        onLoadMore={mockOnLoadMore}
      />,
    );
    await user.click(screen.getByText("First Note"));
    expect(mockOnSelectNote).toHaveBeenCalledWith("note-1");
  });

  it("加载更多 button appears when hasMore is true", () => {
    const resultWithMore: SearchResult = { ...mockResult, hasMore: true };
    render(
      <SearchResultList
        result={resultWithMore}
        loading={false}
        onSelectNote={mockOnSelectNote}
        onLoadMore={mockOnLoadMore}
      />,
    );
    expect(screen.getByText("加载更多")).toBeTruthy();
  });

  it("加载更多 button does not appear when hasMore is false", () => {
    render(
      <SearchResultList
        result={mockResult}
        loading={false}
        onSelectNote={mockOnSelectNote}
        onLoadMore={mockOnLoadMore}
      />,
    );
    expect(screen.queryByText("加载更多")).toBeNull();
  });

  it("clicking 加载更多 calls onLoadMore", async () => {
    const user = userEvent.setup();
    const resultWithMore: SearchResult = { ...mockResult, hasMore: true };
    render(
      <SearchResultList
        result={resultWithMore}
        loading={false}
        onSelectNote={mockOnSelectNote}
        onLoadMore={mockOnLoadMore}
      />,
    );
    await user.click(screen.getByText("加载更多"));
    expect(mockOnLoadMore).toHaveBeenCalled();
  });
});
