import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useAttachmentRenderer } from "../../hooks/useAttachmentRenderer";

export default function VideoRenderer({ node }: NodeViewProps) {
  const src = node.attrs.src as string | null;
  const title = node.attrs.title as string | null;
  const { resolvedSrc, error } = useAttachmentRenderer(src ?? "");

  if (error) {
    return (
      <NodeViewWrapper>
        <div className="attachment-error">视频附件丢失</div>
      </NodeViewWrapper>
    );
  }

  if (!resolvedSrc) {
    return (
      <NodeViewWrapper>
        <div className="attachment-loading">视频加载中...</div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <video
        src={resolvedSrc}
        controls
        preload="metadata"
        className="custom-video"
        title={title || ""}
      />
    </NodeViewWrapper>
  );
}
