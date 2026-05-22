import { NodeViewWrapper } from "@tiptap/react";
import { useAttachmentRenderer } from "../../hooks/useAttachmentRenderer";

interface VideoRendererProps {
  node: { attrs: { src: string; title?: string } };
}

export default function VideoRenderer({ node }: VideoRendererProps) {
  const { src, title } = node.attrs;
  const { resolvedSrc, error } = useAttachmentRenderer(src);

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