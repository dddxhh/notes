import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tag } from "@notes/core";

afterEach(cleanup);

const mockTags: Tag[] = [
  { id: "id1", name: "work" },
  { id: "id2", name: "personal" },
  { id: "id3", name: "important" },
];

const mockOnAdd = vi.fn();
const mockOnRemove = vi.fn();
const mockOnCreateTag = vi.fn();

let mockStoreTags: Tag[] = mockTags;

vi.mock("../../src/stores/tagsStore", () => ({
  useTagsStore: (selector: any) =>
    selector({
      tags: mockStoreTags,
      loading: false,
      setTags: vi.fn(),
      addTag: vi.fn(),
      removeTag: vi.fn(),
      deleteTag: vi.fn(),
      setLoading: vi.fn(),
    }),
}));

vi.mock("@radix-ui/react-popover", () => ({
  Root: ({ children }: any) => children,
  Trigger: ({ children }: any) => children,
  Portal: ({ children }: any) => children,
  Content: ({ children }: any) => <div>{children}</div>,
}));

import TagSelector from "../../src/components/shared/TagSelector";

describe("TagSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreTags = [...mockTags];
  });

  it("renders trigger button", () => {
    render(
      <TagSelector
        selectedTagIds={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onCreateTag={mockOnCreateTag}
      />,
    );
    expect(screen.getByText("添加标签")).toBeTruthy();
  });

  it("renders list of available tags after clicking trigger", async () => {
    const user = userEvent.setup();
    render(
      <TagSelector
        selectedTagIds={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onCreateTag={mockOnCreateTag}
      />,
    );
    await user.click(screen.getByText("添加标签"));
    expect(screen.getByText("work")).toBeTruthy();
    expect(screen.getByText("personal")).toBeTruthy();
    expect(screen.getByText("important")).toBeTruthy();
  });

  it("clicking an unselected tag calls onAdd", async () => {
    const user = userEvent.setup();
    render(
      <TagSelector
        selectedTagIds={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onCreateTag={mockOnCreateTag}
      />,
    );
    await user.click(screen.getByText("添加标签"));
    await user.click(screen.getByText("work"));
    expect(mockOnAdd).toHaveBeenCalledWith("id1");
  });

  it("clicking a selected tag calls onRemove", async () => {
    const user = userEvent.setup();
    render(
      <TagSelector
        selectedTagIds={["id1"]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onCreateTag={mockOnCreateTag}
      />,
    );
    await user.click(screen.getByText("添加标签"));
    await user.click(screen.getByText("work"));
    expect(mockOnRemove).toHaveBeenCalledWith("id1");
  });

  it("search input filters tag list by name", async () => {
    const user = userEvent.setup();
    render(
      <TagSelector
        selectedTagIds={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onCreateTag={mockOnCreateTag}
      />,
    );
    await user.click(screen.getByText("添加标签"));
    const searchInput = screen.getByPlaceholderText("搜索或创建标签...");
    await user.type(searchInput, "work");
    expect(screen.getByText("work")).toBeTruthy();
    expect(screen.queryByText("personal")).toBeNull();
    expect(screen.queryByText("important")).toBeNull();
  });

  it("shows create option when search has no exact match", async () => {
    const user = userEvent.setup();
    render(
      <TagSelector
        selectedTagIds={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onCreateTag={mockOnCreateTag}
      />,
    );
    await user.click(screen.getByText("添加标签"));
    const searchInput = screen.getByPlaceholderText("搜索或创建标签...");
    await user.type(searchInput, "newtag");
    expect(screen.getByText("创建 'newtag'")).toBeTruthy();
  });

  it("does not show create option when search exactly matches existing tag", async () => {
    const user = userEvent.setup();
    render(
      <TagSelector
        selectedTagIds={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onCreateTag={mockOnCreateTag}
      />,
    );
    await user.click(screen.getByText("添加标签"));
    const searchInput = screen.getByPlaceholderText("搜索或创建标签...");
    await user.type(searchInput, "work");
    expect(screen.queryByText("创建 'work'")).toBeNull();
  });

  it("clicking create option calls onCreateTag", async () => {
    const user = userEvent.setup();
    render(
      <TagSelector
        selectedTagIds={[]}
        onAdd={mockOnAdd}
        onRemove={mockOnRemove}
        onCreateTag={mockOnCreateTag}
      />,
    );
    await user.click(screen.getByText("添加标签"));
    const searchInput = screen.getByPlaceholderText("搜索或创建标签...");
    await user.type(searchInput, "newtag");
    await user.click(screen.getByText("创建 'newtag'"));
    expect(mockOnCreateTag).toHaveBeenCalledWith("newtag");
  });
});
