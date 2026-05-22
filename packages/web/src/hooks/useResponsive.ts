import { useState, useEffect } from "react";
import { useUIStore } from "../stores";

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface ResponsiveState {
  device: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

export function useResponsive(): ResponsiveState {
  const [width, setWidth] = useState(window.innerWidth);
  const setIsMobile = useUIStore((s) => s.setIsMobile);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWidth(newWidth);
      setIsMobile(newWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [setIsMobile]);

  const device: DeviceType = width < 640 ? "mobile" : width < 768 ? "tablet" : "desktop";

  return {
    device,
    isMobile: width < 640,
    isTablet: width >= 640 && width < 768,
    isDesktop: width >= 768,
    width,
  };
}