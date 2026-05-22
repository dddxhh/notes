import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockSearchResult = {
  notes: [
    { id: "s1", title: "Search Result 1", updatedAt: 1 },
    { id: "s2", title: "Search Result 2", updatedAt: 2 },
  ],
  total: 2,
  hasMore: false,
};

vi.mock("../../src/hooks", () => ({
  useSearch: () => ({
    searchInput: { query: "" },
    result: mockSearchResult,
    loading: false,
    executeSearch: vi.fn(),
    updateFilter: vi.fn(),
    clearSearch: vi.fn(),
  }),
  useStorage: () => ({
    listNotes: vi.fn().mockResolvedValue([]),
    listFolders: vi.fn().mockResolvedValue([]),
    listTags: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("../../src/stores", () => ({
  useNotesStore: (selector?: any) => {
    const state = { notes: [], currentNote: null, setCurrentNote: vi.fn(), setNotes: vi.fn() };
    return selector ? selector(state) : state;
  },
  useFoldersStore: (selector?: any) => {
    const state = { folders: [], currentFolderId: null, setFolders: vi.fn() };
    return selector ? selector(state) : state;
  },
  useTagsStore: (selector?: any) => {
    const state = { tags: [{ id: "t1", name: "work" }, { id: "t2", name: "personal" }], setTags: vi.fn() };
    return selector ? selector(state) : state;
  },
  useUIStore: (selector?: any) => {
    const state = { theme: "light", editorMode: "wysiwyg", sidebarOpen: true, isMobile: true, setEditorMode: vi.fn(), setTheme: vi.fn(), setSidebarOpen: vi.fn(), setIsMobile: vi.fn() };
    return selector ? selector(state) : state;
  },
  useSlashCommandStore: (selector?: any) => {
    const state = { pendingUpload: null, setPendingUpload: vi.fn() };
    return selector ? selector(state) : state;
  },
  useAttachmentsStore: (selector?: any) => {
    const state = { attachments: [], addAttachment: vi.fn() };
    return selector ? selector(state) : state;
  },
}));

vi.mock("../../src/components/shared/SearchBar", () => ({
  default: (props: any) => (
    <div data-testid="search-bar">
      <input data-testid="search-input" value={props.query} onChange={(e) => props.onQueryChange(e.target.value)} />
      <button data-testid="filter-toggle" onClick={props.onToggleFilter}>{props.showFilter ? "▲筛选" : "▼筛选"}</button>
    </div>
  ),
}));

vi.mock("../../src/components/shared/SearchFilterPanel", () => ({
  default: (props: any) => (
    <div data-testid="search-filter-panel">SearchFilterPanel</div>
  ),
}));

vi.mock("../../src/components/shared/SearchResultList", () => ({
  default: (props: any) => (
    <div data-testid="search-result-list">
      {props.result?.notes?.map((n: any) => (
        <button key={n.id} onClick={() => props.onSelectNote(n.id)}>{n.title}</button>
      ))}
    </div>
  ),
}));

import MobileSearch from "../../src/components/mobile/MobileSearch";

describe("MobileSearch", () => {
  it("renders SearchBar", () => {
    render(<MobileSearch />);
    expect(screen.getByTestId("search-bar")).toBeTruthy();
  });

  it("renders SearchResultList", () => {
    render(<MobileSearch />);
    expect(screen.getByTestId("search-result-list")).toBeTruthy();
  });

  it("renders SearchFilterPanel when filter is toggled", async () => {
    const user = userEvent.setup();
    render(<MobileSearch />);
    await user.click(screen.getByTestId("filter-toggle"));
    expect(screen.getByTestId("search-filter-panel")).toBeTruthy();
  });

  it("renders search results", () => {
    render(<MobileSearch />);
    expect(screen.getByText("Search Result 1")).toBeTruthy();
    expect(screen.getByText("Search Result 2")).toBeTruthy();
  });

  it("calls onSelectNote when a search result is clicked", async () => {
    const onSelectNote = vi.fn();
    render(<MobileSearch onSelectNote={onSelectNote} />);
    await userEvent.setup().click(screen.getByText("Search Result 1"));
    expect(onSelectNote).toHaveBeenCalledWith("s1");
  });

  it("renders fullscreen container", () => {
    const { container } = render(<MobileSearch />);
    expect(container.firstChild).toBeTruthy();
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-screen");
  });
});