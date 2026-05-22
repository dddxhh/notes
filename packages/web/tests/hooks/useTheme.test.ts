import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSetTheme = vi.fn();
let mockTheme: "light" | "dark" = "light";

vi.mock("../../src/stores", () => ({
  useUIStore: (selector: any) =>
    selector({ theme: mockTheme, setTheme: mockSetTheme }),
}));

import { useTheme } from "../../src/hooks/useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = "light";
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults theme to light", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("toggleTheme switches from light to dark", () => {
    mockTheme = "light";
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("toggleTheme switches from dark to light", () => {
    mockTheme = "dark";
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("persists theme to localStorage on change", () => {
    mockTheme = "dark";
    renderHook(() => useTheme());
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("loads theme from localStorage on mount", () => {
    localStorage.setItem("theme", "dark");
    mockTheme = "dark";
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("adds dark class to document.documentElement when theme is dark", () => {
    mockTheme = "dark";
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when theme is light", () => {
    mockTheme = "light";
    document.documentElement.classList.add("dark");
    renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});