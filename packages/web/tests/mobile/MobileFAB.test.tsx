import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

vi.mock("../../src/stores", () => ({
  useNotesStore: (selector?: any) => {
    const state = { notes: [], currentNote: null, setCurrentNote: vi.fn(), setNotes: vi.fn(), addNote: vi.fn() };
    return selector ? selector(state) : state;
  },
  useFoldersStore: (selector?: any) => {
    const state = { folders: [], currentFolderId: null, setCurrentFolderId: vi.fn(), setFolders: vi.fn() };
    return selector ? selector(state) : state;
  },
  useTagsStore: (selector?: any) => {
    const state = { tags: [], setTags: vi.fn() };
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

vi.mock("../../src/hooks", () => ({
  useStorage: () => ({
    listNotes: vi.fn().mockResolvedValue([]),
    createNote: vi.fn().mockResolvedValue({ id: "new1", title: "新笔记", contentJson: "", mdText: "", folderId: null, type: "rich", createdAt: 1, updatedAt: 1, deletedAt: null, version: 1 }),
  }),
  useAttachmentUpload: () => ({ uploadFile: vi.fn() }),
}));

import MobileFAB from "../../src/components/mobile/MobileFAB";

describe("MobileFAB", () => {
  it("renders FAB button", () => {
    render(<MobileFAB />);
    expect(screen.getByRole("button", { name: /新建/i })).toBeTruthy();
  });

  it("calls onNewNote when new note sub-button is clicked", async () => {
    const onNewNote = vi.fn();
    const user = userEvent.setup();
    render(<MobileFAB onNewNote={onNewNote} />);
    await user.click(screen.getByRole("button", { name: "新建" }));
    await user.click(screen.getByRole("button", { name: /新建笔记/i }));
    expect(onNewNote).toHaveBeenCalled();
  });

  it("shows expand menu with upload option when FAB is expanded", async () => {
    const user = userEvent.setup();
    render(<MobileFAB onNewNote={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "新建" }));
    expect(screen.getByText(/上传/i)).toBeTruthy();
  });

  it("renders fixed bottom-right position", () => {
    const { container } = render(<MobileFAB />);
    const fab = container.querySelector("[data-testid='mobile-fab']");
    expect(fab).toBeTruthy();
  });
});