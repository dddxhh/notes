import { useEffect, useState } from "react";
import { initStorage } from "./lib";
import { useResponsive, useTheme, useAttachmentIntegrity } from "./hooks";
import DesktopLayout from "./components/layouts/DesktopLayout";
import MobileLayout from "./components/layouts/MobileLayout";
import AttachmentIntegrityBanner from "./components/shared/AttachmentIntegrityBanner";

export default function App() {
  const [ready, setReady] = useState(false);
  const { isMobile } = useResponsive();
  useTheme();
  const { missingAttachments, checked } = useAttachmentIntegrity();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    initStorage().then(() => setReady(true));
  }, []);

  if (!ready) return <div className="flex items-center justify-center h-screen text-gray-500">正在初始化...</div>;

  return (
    <>
      {checked && !bannerDismissed && (
        <AttachmentIntegrityBanner
          missingAttachments={missingAttachments}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </>
  );
}