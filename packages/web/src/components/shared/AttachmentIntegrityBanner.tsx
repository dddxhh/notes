import { useState } from "react";

interface AttachmentIntegrityBannerProps {
  missingAttachments: string[];
  onDismiss: () => void;
}

export default function AttachmentIntegrityBanner({
  missingAttachments,
  onDismiss,
}: AttachmentIntegrityBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (missingAttachments.length === 0 || dismissed) return null;

  return (
    <div className="integrity-banner">
      <span className="integrity-banner-text">
        部分附件文件丢失（{missingAttachments.length} 个），可能影响图片/视频显示。
      </span>
      <button className="integrity-banner-dismiss" onClick={() => { setDismissed(true); onDismiss(); }}>
        关闭
      </button>
    </div>
  );
}