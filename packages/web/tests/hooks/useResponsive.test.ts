import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockSetIsMobile = vi.fn();

vi.mock("../../src/stores", () => ({
  useUIStore: () => mockSetIsMobile,
}));

import { useResponsive } from "../../src/hooks/useResponsive";

describe("useResponsive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mobile for width < 768", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(320);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.device).toBe("mobile");
    expect(result.current.isMobile).toBe(true);
  });

  it("returns tablet for width between 768 and 1024", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(900);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.device).toBe("tablet");
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it("returns desktop for width >= 1024", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1200);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.device).toBe("desktop");
    expect(result.current.isDesktop).toBe(true);
  });

  it("calls setIsMobile on resize", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1200);
    const { result } = renderHook(() => useResponsive());
    expect(mockSetIsMobile).toHaveBeenCalledWith(false);
  });

  it("uses 768 as mobile breakpoint (not 640)", () => {
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(768);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.device).toBe("tablet");
  });

  it("updates on window resize", () => {
    const widthSpy = vi.spyOn(window, "innerWidth", "get").mockReturnValue(1200);
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isDesktop).toBe(true);

    widthSpy.mockReturnValue(500);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.isMobile).toBe(true);
    expect(mockSetIsMobile).toHaveBeenCalledWith(true);
  });
});