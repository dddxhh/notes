import { Note, Attachment } from "@notes/core";
import TagBadge from "./TagBadge";
import NoteCardMenu from "./NoteCardMenu";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useThumbnailRenderer } from "../../hooks/useThumbnailRenderer";
import { extractTitleFromContent } from "../../lib/markdown-serializer";
import { formatShortDateTime } from "../../lib/format-date";

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  tags?: { id: string; name: string }[];
  attachments?: Attachment[];
  onDelete?: (note: Note) => void;
  onMoveToFolder?: (note: Note) => void;
  onCopyMarkdown?: (note: Note) => void;
}

export default function NoteCard({
  note,
  onClick,
  tags,
  attachments,
  onDelete,
  onMoveToFolder,
  onCopyMarkdown,
}: NoteCardProps) {
  const timeStr = formatShortDateTime(note.updatedAt);

  const firstImage = attachments?.find((a) => a.type === "image");
  const { thumbnailSrc, error: thumbError } = useThumbnailRenderer(firstImage?.id ?? "");

  return (
    <div>
      <div
        onClick={() => onClick(note)}
        className="block w-full p-3 rounded-lg hover:shadow-sm transition-colors text-left group cursor-pointer"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
        }}
      >
        <div className="flex gap-3">
          {firstImage && (
            <div className="flex-shrink-0">
              {thumbError ? (
                <div
                  className="note-card-thumbnail-placeholder w-[200px] h-[120px] rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                >
                  图片丢失
                </div>
              ) : thumbnailSrc ? (
                <img
                  src={thumbnailSrc}
                  alt={note.title}
                  className="note-card-thumbnail w-[200px] h-[120px] object-cover rounded"
                />
              ) : (
                <div
                  className="note-card-thumbnail-placeholder w-[200px] h-[120px] rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
                >
                  加载中...
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div
                className="font-semibold text-sm truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {note.title || (
                  <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                    {extractTitleFromContent(note.mdText)}
                  </span>
                )}
              </div>
              {(onDelete || onMoveToFolder) && (
                <div className="flex-shrink-0">
                  <NoteCardMenu
                    onDelete={() => onDelete?.(note)}
                    onMoveToFolder={() => onMoveToFolder?.(note)}
                    onCopyMarkdown={() => onCopyMarkdown?.(note)}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {timeStr}
              </span>
              {tags && tags.length > 0 && (
                <div className="flex items-center gap-1 overflow-hidden">
                  {tags.slice(0, 2).map((tag) => (
                    <TagBadge key={tag.id} name={tag.name} />
                  ))}
                  {tags.length > 2 && (
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full cursor-default"
                          style={{
                            backgroundColor: "var(--bg-tertiary)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          +{tags.length - 2}
                        </span>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="rounded-md px-3 py-2 text-xs shadow-lg z-50"
                          style={{
                            backgroundColor: "var(--bg-primary)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-color)",
                          }}
                          sideOffset={4}
                        >
                          {tags
                            .slice(2)
                            .map((tag) => tag.name)
                            .join(", ")}
                          <Tooltip.Arrow style={{ fill: "var(--bg-primary)" }} />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
