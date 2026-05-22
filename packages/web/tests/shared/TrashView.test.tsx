import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Note } from "@notes/core";

afterEach(cleanup);

const mockDeletedNotes: Note[] = [
  {
    id: "n1",
    title: "Deleted Note 1",
    contentJson: "",
    mdText: "",
    folderId: null,
    type: "rich",
    createdAt: 1000,
    updatedAt: 2000,
    deletedAt: 6000,
    version: 1,
  },
  {
    id: "n2",
    title: "Deleted Note 2",
    contentJson: "",
    mdText: "",
    folderId: "f1",
    type: "rich",
    createdAt: 4000,
    updatedAt: 5000,
    deletedAt: 3000,
    version: 2,
  },
];

const mockRestoreNote = vi.fn().mockResolvedValue(undefined);
const mockPermanentlyDeleteNote = vi.fn().mockResolvedValue(undefined);
const mockLoadDeletedNotes = vi.fn().mockResolvedValue(undefined);
const mockSetDeletedNotes = vi.fn();
const mockSetShowTrash = vi.fn();

const mockNotesState = {
  deletedNotes: mockDeletedNotes,
  restoreNote: mockRestoreNote,
  permanentlyDeleteNote: mockPermanentlyDeleteNote,
  loadDeletedNotes: mockLoadDeletedNotes,
  setDeletedNotes: mockSetDeletedNotes,
};

const mockUIState = {
  showTrash: true as boolean,
  setShowTrash: mockSetShowTrash,
};

vi.mock("../../src/stores", () => ({
  useNotesStore: (selector?: any) => (selector ? selector(mockNotesState) : mockNotesState),
  useUIStore: (selector?: any) => (selector ? selector(mockUIState) : mockUIState),
  useFoldersStore: vi.fn(),
  useAttachmentsStore: vi.fn(),
  useTagsStore: vi.fn(),
  useSlashCommandStore: vi.fn(),
}));

import TrashView from "../../src/components/shared/TrashView";

describe("TrashView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotesState.deletedNotes = [...mockDeletedNotes];
    mockUIState.showTrash = true;
  });

  it("renders 回收站 title and close button", () => {
    render(<TrashView />);
    expect(screen.getByText("回收站")).toBeTruthy();
    expect(screen.getByText("✕")).toBeTruthy();
  });

  it("calls loadDeletedNotes on mount", () => {
    render(<TrashView />);
    expect(mockLoadDeletedNotes).toHaveBeenCalled();
  });

  it("shows deleted notes with titles", () => {
    render(<TrashView />);
    expect(screen.getByText("Deleted Note 1")).toBeTruthy();
    expect(screen.getByText("Deleted Note 2")).toBeTruthy();
  });

  it("shows 恢复 button for each note", () => {
    render(<TrashView />);
    const restoreButtons = screen.getAllByRole("button", { name: "恢复" });
    expect(restoreButtons.length).toBe(2);
  });

  it("shows 彻底删除 button for each note", () => {
    render(<TrashView />);
    const deleteButtons = screen.getAllByRole("button", { name: "彻底删除" });
    expect(deleteButtons.length).toBe(2);
  });

  it("shows empty state when no deleted notes", () => {
    mockNotesState.deletedNotes = [];
    render(<TrashView />);
    expect(screen.getByText("回收站为空")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "恢复" })).toBeNull();
  });

  it("shows 清空回收站 button when there are deleted notes", () => {
    render(<TrashView />);
    expect(screen.getByRole("button", { name: "清空回收站" })).toBeTruthy();
  });

  it("does not show 清空回收站 when trash is empty", () => {
    mockNotesState.deletedNotes = [];
    render(<TrashView />);
    expect(screen.queryByRole("button", { name: "清空回收站" })).toBeNull();
  });

  it("clicking close button calls setShowTrash(false)", async () => {
    const user = userEvent.setup();
    render(<TrashView />);
    await user.click(screen.getByText("✕"));
    expect(mockSetShowTrash).toHaveBeenCalledWith(false);
  });

  it("clicking 恢复 calls restoreNote with note id", async () => {
    const user = userEvent.setup();
    render(<TrashView />);
    const restoreButtons = screen.getAllByRole("button", { name: "恢复" });
    await user.click(restoreButtons[0]);
    expect(mockRestoreNote).toHaveBeenCalledWith("n1");
  });

  it("clicking 彻底删除 shows inline confirmation", async () => {
    const user = userEvent.setup();
    render(<TrashView />);
    const deleteButtons = screen.getAllByRole("button", { name: "彻底删除" });
    await user.click(deleteButtons[0]);
    expect(screen.getByText("确定要彻底删除这条笔记吗？此操作不可恢复。")).toBeTruthy();
  });

  it("confirming 彻底删除 calls permanentlyDeleteNote", async () => {
    const user = userEvent.setup();
    render(<TrashView />);
    const deleteButtons = screen.getAllByRole("button", { name: "彻底删除" });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole("button", { name: "确定" }));
    expect(mockPermanentlyDeleteNote).toHaveBeenCalledWith("n1");
  });

  it("canceling 彻底删除 dismisses confirmation", async () => {
    const user = userEvent.setup();
    render(<TrashView />);
    const deleteButtons = screen.getAllByRole("button", { name: "彻底删除" });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByText("确定要彻底删除这条笔记吗？此操作不可恢复。")).toBeNull();
    expect(mockPermanentlyDeleteNote).not.toHaveBeenCalled();
  });

  it("clicking 清空回收站 shows confirmation", async () => {
    const user = userEvent.setup();
    render(<TrashView />);
    await user.click(screen.getByRole("button", { name: "清空回收站" }));
    expect(
      screen.getByText("确定要清空回收站吗？所有笔记将被永久删除，此操作不可恢复。"),
    ).toBeTruthy();
  });

  it("confirming 清空回收站 calls permanentlyDeleteNote for each note", async () => {
    const user = userEvent.setup();
    render(<TrashView />);
    await user.click(screen.getByRole("button", { name: "清空回收站" }));
    const confirmButtons = screen.getAllByRole("button", { name: "确定" });
    await user.click(confirmButtons[confirmButtons.length - 1]);
    expect(mockPermanentlyDeleteNote).toHaveBeenCalledWith("n1");
    expect(mockPermanentlyDeleteNote).toHaveBeenCalledWith("n2");
  });

  it("returns null when showTrash is false", () => {
    mockUIState.showTrash = false;
    const { container } = render(<TrashView />);
    expect(container.innerHTML).toBe("");
  });
});
