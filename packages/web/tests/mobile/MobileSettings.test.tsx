import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

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
    listFolders: vi.fn().mockResolvedValue([]),
    listTags: vi.fn().mockResolvedValue([]),
  }),
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("../../src/components/shared/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

vi.mock("../../src/components/shared/ModeToggle", () => ({
  default: () => <div data-testid="mode-toggle">ModeToggle</div>,
}));

import MobileSettings from "../../src/components/mobile/MobileSettings";

describe("MobileSettings", () => {
  it("renders ThemeToggle", () => {
    render(<MobileSettings />);
    expect(screen.getByTestId("theme-toggle")).toBeTruthy();
  });

  it("renders editor mode selector", () => {
    render(<MobileSettings />);
    expect(screen.getByTestId("mode-toggle")).toBeTruthy();
  });

  it("renders data management section", () => {
    render(<MobileSettings />);
    expect(screen.getByText(/数据管理/i)).toBeTruthy();
  });

  it("renders about info", () => {
    render(<MobileSettings />);
    expect(screen.getByText(/关于/i)).toBeTruthy();
  });

  it("renders fullscreen container", () => {
    const { container } = render(<MobileSettings />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-screen");
  });
});