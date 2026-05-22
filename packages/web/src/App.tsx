import { useEffect, useState } from "react";
import { initStorage } from "./lib";
import { useResponsive, useTheme } from "./hooks";
import DesktopLayout from "./components/layouts/DesktopLayout";
import MobileLayout from "./components/layouts/MobileLayout";

export default function App() {
  const [ready, setReady] = useState(false);
  const { isMobile } = useResponsive();
  useTheme();

  useEffect(() => {
    initStorage().then(() => setReady(true));
  }, []);

  if (!ready) return <div className="flex items-center justify-center h-screen text-gray-500">正在初始化...</div>;

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}