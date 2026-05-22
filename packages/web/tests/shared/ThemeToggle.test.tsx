import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(cleanup);

const mockSetTheme = vi.fn();
let mockTheme: "light" | "dark" = "light";

vi.mock("../../src/stores", () => ({
  useUIStore: (selector: any) =>
    selector({ theme: mockTheme, setTheme: mockSetTheme }),
}));

vi.mock("../../src/hooks/useTheme", () => ({
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: () => mockSetTheme(mockTheme === "light" ? "dark" : "light"),
  }),
}));

import ThemeToggle from "../../src/components/shared/ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "light";
  });

  it("renders moon icon when theme is light", () => {
    const { container } = render(<ThemeToggle />);
    expect(container.textContent).toContain("🌙");
  });

  it("renders sun icon when theme is dark", () => {
    mockTheme = "dark";
    const { container } = render(<ThemeToggle />);
    expect(container.textContent).toContain("☀️");
  });

  it("clicking button toggles theme", async () => {
    const user = userEvent.setup();
    const { container } = render(<ThemeToggle />);
    const button = container.querySelector("button")!;
    await user.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("button title changes based on theme", () => {
    mockTheme = "light";
    const { container } = render(<ThemeToggle />);
    const button = container.querySelector("button")!;
    expect(button.title).toBe("切换深色模式");

    cleanup();

    mockTheme = "dark";
    const { container: c2 } = render(<ThemeToggle />);
    const button2 = c2.querySelector("button")!;
    expect(button2.title).toBe("切换浅色模式");
  });
});