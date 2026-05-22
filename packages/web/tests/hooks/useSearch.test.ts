import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { SearchResult } from "@notes/core";

const mockSearchResult: SearchResult = {
  notes: [
    { id: "note-1", title: "Test Note", updatedAt: Date.now() },
    { id: "note-2", title: "Another Note", updatedAt: Date.now() },
  ],
  total: 2,
  hasMore: false,
};

const mockSearchNotes = vi.fn().mockResolvedValue(mockSearchResult);

vi.mock("../../src/lib/sqlite-init", () => ({
  getStorage: () => ({
    searchNotes: mockSearchNotes,
  }),
}));

import { useSearch } from "../../src/hooks/useSearch";

describe("useSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchNotes.mockResolvedValue(mockSearchResult);
  });

  it("initial state has empty searchInput, null result, false loading", () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.searchInput).toEqual({});
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("executeSearch calls storage.searchNotes and updates result", async () => {
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.executeSearch({ query: "test" });
    });
    expect(mockSearchNotes).toHaveBeenCalledWith({ query: "test" });
    expect(result.current.result).toEqual(mockSearchResult);
    expect(result.current.loading).toBe(false);
  });

  it("updateFilter with query updates searchInput and triggers search", async () => {
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      result.current.updateFilter({ query: "hello" });
    });
    expect(result.current.searchInput.query).toBe("hello");
    expect(mockSearchNotes).toHaveBeenCalledWith({ query: "hello" });
  });

  it("updateFilter with folderId updates searchInput and triggers search", async () => {
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      result.current.updateFilter({ folderId: "folder1" });
    });
    expect(result.current.searchInput.folderId).toBe("folder1");
    expect(mockSearchNotes).toHaveBeenCalled();
  });

  it("updateFilter with tagIds and tagMode triggers search", async () => {
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      result.current.updateFilter({ tagIds: ["tag1", "tag2"], tagMode: "intersection" });
    });
    expect(result.current.searchInput.tagIds).toEqual(["tag1", "tag2"]);
    expect(result.current.searchInput.tagMode).toBe("intersection");
    expect(mockSearchNotes).toHaveBeenCalled();
  });

  it("clearSearch resets searchInput and result", async () => {
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      result.current.updateFilter({ query: "test" });
    });
    expect(result.current.result).not.toBeNull();
    act(() => {
      result.current.clearSearch();
    });
    expect(result.current.searchInput).toEqual({});
    expect(result.current.result).toBeNull();
  });

  it("loading is true during search, false after", async () => {
    let resolveSearch: (r: SearchResult) => void;
    mockSearchNotes.mockImplementation(
      () =>
        new Promise<SearchResult>((resolve) => {
          resolveSearch = resolve;
        }),
    );
    const { result } = renderHook(() => useSearch());
    act(() => {
      result.current.executeSearch({ query: "slow" });
    });
    expect(result.current.loading).toBe(true);
    await act(async () => {
      resolveSearch!(mockSearchResult);
    });
    expect(result.current.loading).toBe(false);
  });

  it("updateFilter with empty fields clears result", () => {
    const { result } = renderHook(() => useSearch());
    act(() => {
      result.current.updateFilter({});
    });
    expect(result.current.result).toBeNull();
  });

  it("executeSearch on error sets result to null", async () => {
    mockSearchNotes.mockRejectedValue(new Error("search failed"));
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.executeSearch({ query: "fail" });
    });
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
