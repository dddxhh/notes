import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import SearchBar from "../../src/components/shared/SearchBar";

describe("SearchBar", () => {
  const mockOnQueryChange = vi.fn();
  const mockOnToggleFilter = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input with placeholder 搜索笔记...", () => {
    render(<SearchBar query="" onQueryChange={mockOnQueryChange} showFilter={false} onToggleFilter={mockOnToggleFilter} />);
    expect(screen.getByPlaceholderText("搜索笔记...")).toBeTruthy();
  });

  it("typing in input calls onQueryChange with value", async () => {
    const user = userEvent.setup();
    render(<SearchBar query="" onQueryChange={mockOnQueryChange} showFilter={false} onToggleFilter={mockOnToggleFilter} />);
    const input = screen.getByPlaceholderText("搜索笔记...");
    await user.type(input, "hello");
    expect(mockOnQueryChange).toHaveBeenCalled();
  });

  it("clear button appears when query is non-empty", () => {
    render(<SearchBar query="test" onQueryChange={mockOnQueryChange} showFilter={false} onToggleFilter={mockOnToggleFilter} />);
    expect(screen.getByLabelText("清除搜索")).toBeTruthy();
  });

  it("clear button does not appear when query is empty", () => {
    render(<SearchBar query="" onQueryChange={mockOnQueryChange} showFilter={false} onToggleFilter={mockOnToggleFilter} />);
    expect(screen.queryByLabelText("清除搜索")).toBeNull();
  });

  it("clicking clear button calls onQueryChange with empty string", async () => {
    const user = userEvent.setup();
    render(<SearchBar query="test" onQueryChange={mockOnQueryChange} showFilter={false} onToggleFilter={mockOnToggleFilter} />);
    await user.click(screen.getByLabelText("清除搜索"));
    expect(mockOnQueryChange).toHaveBeenCalledWith("");
  });

  it("renders filter toggle button", () => {
    render(<SearchBar query="" onQueryChange={mockOnQueryChange} showFilter={false} onToggleFilter={mockOnToggleFilter} />);
    expect(screen.getByLabelText("筛选切换")).toBeTruthy();
  });

  it("filter toggle shows ▲筛选 when showFilter is true", () => {
    render(<SearchBar query="" onQueryChange={mockOnQueryChange} showFilter={true} onToggleFilter={mockOnToggleFilter} />);
    expect(screen.getByText("▲筛选")).toBeTruthy();
  });

  it("filter toggle shows ▼筛选 when showFilter is false", () => {
    render(<SearchBar query="" onQueryChange={mockOnQueryChange} showFilter={false} onToggleFilter={mockOnToggleFilter} />);
    expect(screen.getByText("▼筛选")).toBeTruthy();
  });

  it("clicking filter toggle calls onToggleFilter", async () => {
    const user = userEvent.setup();
    render(<SearchBar query="" onQueryChange={mockOnQueryChange} showFilter={false} onToggleFilter={mockOnToggleFilter} />);
    await user.click(screen.getByLabelText("筛选切换"));
    expect(mockOnToggleFilter).toHaveBeenCalled();
  });
});