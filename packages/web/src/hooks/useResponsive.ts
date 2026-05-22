import { useState, useEffect } from "react";
import { useUIStore } from "../stores";

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface ResponsiveState {
  device: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isKeyboardVisible: boolean;
  width: number;
}

export function useResponsive(): ResponsiveState {
  const [width, setWidth] = useState(window.innerWidth);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
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

  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;

    const checkKeyboard = () => {
      const windowHeight = window.innerHeight;
      const vvHeight = vv.height;
      setIsKeyboardVisible(vvHeight < windowHeight * 0.75);
    };

    vv.addEventListener("resize", checkKeyboard);
    checkKeyboard();
    return () => vv.removeEventListener("resize", checkKeyboard);
  }, []);

  const device: DeviceType = width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";

  return {
    device,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isKeyboardVisible,
    width,
  };
}