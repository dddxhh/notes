import { Note, Attachment } from "@notes/core";
import TagBadge from "./TagBadge";
import { useThumbnailRenderer } from "../../hooks/useThumbnailRenderer";

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
      className="block w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-colors text-left"
    >
      <div className="flex gap-3">
        {firstImage && (
          <div className="flex-shrink-0">
            {thumbError ? (
              <div className="note-card-thumbnail-placeholder w-[200px] h-[120px] bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                图片丢失
              </div>
            ) : thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={note.title}
                className="note-card-thumbnail w-[200px] h-[120px] object-cover rounded"
              />
            ) : (
              <div className="note-card-thumbnail-placeholder w-[200px] h-[120px] bg-gray-50 rounded flex items-center justify-center text-gray-400 text-xs">
                加载中...
              </div>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 text-sm truncate">{note.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{timeStr}</span>
            {tags?.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} />
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}