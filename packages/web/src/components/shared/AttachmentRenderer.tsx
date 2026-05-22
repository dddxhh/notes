import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useAttachmentRenderer } from "../../hooks/useAttachmentRenderer";

export default function AttachmentRenderer({ node }: NodeViewProps) {
  const src = node.attrs.src as string | null;
  const alt = node.attrs.alt as string | null;
  const title = node.attrs.title as string | null;
  const { resolvedSrc, error } = useAttachmentRenderer(src ?? "");

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