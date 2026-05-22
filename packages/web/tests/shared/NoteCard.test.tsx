import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockThumbnailSrc = vi.fn();
const mockThumbnailError = vi.fn();

vi.mock("../../src/hooks/useThumbnailRenderer", () => ({
  useThumbnailRenderer: (attachmentId: string) => ({
    thumbnailSrc: mockThumbnailSrc(attachmentId),
    error: mockThumbnailError(attachmentId),
  }),
}));

afterEach(cleanup);

import NoteCard from "../../src/components/shared/NoteCard";
import type { Attachment } from "@notes/core";

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
  afterEach(() => {
    vi.clearAllMocks();
    mockThumbnailSrc.mockReturnValue(null);
    mockThumbnailError.mockReturnValue(false);
  });

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

describe("NoteCard thumbnail display", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockThumbnailSrc.mockReturnValue(null);
    mockThumbnailError.mockReturnValue(false);
  });

  const imageAttachment: Attachment = {
    id: "att-img-1",
    noteId: "note-1",
    type: "image",
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    size: 5000,
    createdAt: Date.now(),
  };

  const videoAttachment: Attachment = {
    id: "att-vid-1",
    noteId: "note-1",
    type: "video",
    filename: "clip.mp4",
    mimeType: "video/mp4",
    size: 50000,
    createdAt: Date.now(),
  };

  it("shows thumbnail when first image attachment exists and thumbnail resolves", () => {
    mockThumbnailSrc.mockReturnValue("blob:http://localhost/thumb-url");
    mockThumbnailError.mockReturnValue(false);
    const { container } = render(
      <NoteCard note={mockNote} onClick={vi.fn()} attachments={[imageAttachment]} />,
    );
    const img = container.querySelector("img.note-card-thumbnail");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("blob:http://localhost/thumb-url");
  });

  it("shows placeholder when thumbnail has error", () => {
    mockThumbnailSrc.mockReturnValue(null);
    mockThumbnailError.mockReturnValue(true);
    const { container } = render(
      <NoteCard note={mockNote} onClick={vi.fn()} attachments={[imageAttachment]} />,
    );
    const placeholder = container.querySelector(".note-card-thumbnail-placeholder");
    expect(placeholder).toBeTruthy();
  });

  it("shows nothing when no attachments", () => {
    mockThumbnailSrc.mockReturnValue(null);
    mockThumbnailError.mockReturnValue(false);
    const { container } = render(<NoteCard note={mockNote} onClick={vi.fn()} />);
    expect(container.querySelector("img.note-card-thumbnail")).toBeNull();
    expect(container.querySelector(".note-card-thumbnail-placeholder")).toBeNull();
  });

  it("shows nothing when only video attachments (no image)", () => {
    mockThumbnailSrc.mockReturnValue(null);
    mockThumbnailError.mockReturnValue(false);
    const { container } = render(
      <NoteCard note={mockNote} onClick={vi.fn()} attachments={[videoAttachment]} />,
    );
    expect(container.querySelector("img.note-card-thumbnail")).toBeNull();
  });

  it("shows thumbnail for first image even when mixed with video attachments", () => {
    mockThumbnailSrc.mockReturnValue("blob:http://localhost/thumb-url2");
    mockThumbnailError.mockReturnValue(false);
    const { container } = render(
      <NoteCard
        note={mockNote}
        onClick={vi.fn()}
        attachments={[videoAttachment, imageAttachment]}
      />,
    );
    const img = container.querySelector("img.note-card-thumbnail");
    expect(img).toBeTruthy();
    expect(mockThumbnailSrc).toHaveBeenCalledWith("att-img-1");
  });
});
