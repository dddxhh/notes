import { Note, Attachment } from "@notes/core";
import TagBadge from "./TagBadge";
import { useThumbnailRenderer } from "../../hooks/useThumbnailRenderer";
import { extractTitleFromContent } from "../../lib/markdown-serializer";

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  tags?: { id: string; name: string }[];
  attachments?: Attachment[];
}

export default function NoteCard({ note, onClick, tags, attachments }: NoteCardProps) {
  const timeStr = new Date(note.updatedAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  const firstImage = attachments?.find((a) => a.type === "image");
  const { thumbnailSrc, error: thumbError } = useThumbnailRenderer(firstImage?.id ?? "");

  return (
    <button
      onClick={() => onClick(note)}
      className="block w-full p-3 rounded-lg hover:shadow-sm transition-colors text-left"
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
          <div className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {note.title || (
              <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                {extractTitleFromContent(note.mdText)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {timeStr}
            </span>
            {tags?.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} />
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
