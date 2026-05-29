import { useEffect, useState } from "react";
import { initStorage } from "./lib";
import { useResponsive, useTheme, useAttachmentIntegrity } from "./hooks";
import DesktopLayout from "./components/layouts/DesktopLayout";
import MobileLayout from "./components/layouts/MobileLayout";
import AttachmentIntegrityBanner from "./components/shared/AttachmentIntegrityBanner";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useSyncStore } from "./stores/syncStore";
import { useAuthStore } from "./stores/authStore";

export default function App() {
  const [ready, setReady] = useState(false);
  const { isMobile } = useResponsive();
  useTheme();
  const { missingAttachments, checked } = useAttachmentIntegrity();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const initSync = useSyncStore((s) => s.initSync);

  useEffect(() => {
    initStorage().then(() => {
      setReady(true);
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist();
      }

      useAuthStore.getState().restore();

      const serverUrl = sessionStorage.getItem("sync-server-url");
      const token = sessionStorage.getItem("sync-token");
      if (serverUrl && token) {
        initSync({
          serverUrl,
          token,
          attachmentStrategy: "full",
        });
      }
    });
  }, []);

  if (!ready)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">正在初始化...</div>
    );

  return (
    <Tooltip.Provider delayDuration={300}>
      {checked && !bannerDismissed && (
        <AttachmentIntegrityBanner
          missingAttachments={missingAttachments}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </Tooltip.Provider>
  );
}
