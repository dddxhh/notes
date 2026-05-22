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
  useTagsStore: (selector: any) => selector({ tags: mockStoreTags, loading: false, setTags: vi.fn(), addTag: vi.fn(), removeTag: vi.fn(), setLoading: vi.fn() }),
}));

vi.mock("../../src/components/shared/TagCreateDialog", () => ({
  default: () => <div data-testid="tag-create-dialog">MockDialog</div>,
}));

import TagSelector from "../../src/components/shared/TagSelector";

describe("TagSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreTags = [...mockTags];
  });

  it("renders list of available tags", () => {
    render(<TagSelector selectedTagIds={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} onCreateTag={mockOnCreateTag} />);
    expect(screen.getByText("work")).toBeTruthy();
    expect(screen.getByText("personal")).toBeTruthy();
    expect(screen.getByText("important")).toBeTruthy();
  });

  it("selected tags are highlighted/checked", () => {
    render(<TagSelector selectedTagIds={["id1"]} onAdd={mockOnAdd} onRemove={mockOnRemove} onCreateTag={mockOnCreateTag} />);
    const workItem = screen.getByText("work").closest("div")!;
    expect(workItem.className).toContain("bg-blue-500");
    const personalItem = screen.getByText("personal").closest("div")!;
    expect(personalItem.className).not.toContain("bg-blue-500");
  });

  it("clicking an unselected tag calls onAdd", async () => {
    const user = userEvent.setup();
    render(<TagSelector selectedTagIds={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} onCreateTag={mockOnCreateTag} />);
    await user.click(screen.getByText("work"));
    expect(mockOnAdd).toHaveBeenCalledWith("id1");
  });

  it("clicking a selected tag calls onRemove", async () => {
    const user = userEvent.setup();
    render(<TagSelector selectedTagIds={["id1"]} onAdd={mockOnAdd} onRemove={mockOnRemove} onCreateTag={mockOnCreateTag} />);
    await user.click(screen.getByText("work"));
    expect(mockOnRemove).toHaveBeenCalledWith("id1");
  });

  it("search input filters tag list by name", async () => {
    const user = userEvent.setup();
    render(<TagSelector selectedTagIds={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} onCreateTag={mockOnCreateTag} />);
    const searchInput = screen.getByPlaceholderText("搜索标签...");
    await user.type(searchInput, "work");
    expect(screen.getByText("work")).toBeTruthy();
    expect(screen.queryByText("personal")).toBeNull();
    expect(screen.queryByText("important")).toBeNull();
  });

  it("新建标签 button is present", () => {
    render(<TagSelector selectedTagIds={[]} onAdd={mockOnAdd} onRemove={mockOnRemove} onCreateTag={mockOnCreateTag} />);
    expect(screen.getByText("新建标签")).toBeTruthy();
  });
});