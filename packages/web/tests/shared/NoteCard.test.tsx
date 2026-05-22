import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

import NoteCard from "../../src/components/shared/NoteCard";

const mockNote = {
  id: "note-1",
  title: "My Note",
  mdText: "Some preview text",
  contentJson: "",
  folderId: null,
  type: "rich",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  deletedAt: null,
  version: 1,
};

describe("NoteCard", () => {
  it("renders note title", () => {
    const { container } = render(<NoteCard note={mockNote} onClick={vi.fn()} />);
    expect(container.textContent).toContain("My Note");
  });

  it("shows tags as TagBadge components", () => {
    const tags = [
      { id: "tag-1", name: "work" },
      { id: "tag-2", name: "ideas" },
    ];
    const { container } = render(<NoteCard note={mockNote} onClick={vi.fn()} tags={tags} />);
    expect(container.textContent).toContain("#work");
    expect(container.textContent).toContain("#ideas");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<NoteCard note={mockNote} onClick={onClick} />);
    const button = container.querySelector("button");
    expect(button).toBeTruthy();
    await user.click(button!);
    expect(onClick).toHaveBeenCalledWith(mockNote);
  });
});