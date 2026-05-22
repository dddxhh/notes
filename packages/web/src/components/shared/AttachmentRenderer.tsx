import { NodeViewWrapper } from "@tiptap/react";
import { useAttachmentRenderer } from "../../hooks/useAttachmentRenderer";

interface AttachmentRendererProps {
  node: { attrs: { src: string; alt?: string; title?: string } };
}

export default function AttachmentRenderer({ node }: AttachmentRendererProps) {
  const { src, alt, title } = node.attrs;
  const { resolvedSrc, error } = useAttachmentRenderer(src);

  if (error) {
    return (
      <NodeViewWrapper>
        <div className="attachment-error">附件丢失</div>
      </NodeViewWrapper>
    );
  }

  if (!resolvedSrc) {
    return (
      <NodeViewWrapper>
        <div className="attachment-loading">加载中...</div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <img
        src={resolvedSrc}
        alt={alt || ""}
        title={title || ""}
        className="custom-image"
        loading="lazy"
      />
    </NodeViewWrapper>
  );
}