import { Note } from "@notes/core";
import TagBadge from "./TagBadge";

interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  tags?: { id: string; name: string }[];
}

export default function NoteCard({ note, onClick, tags }: NoteCardProps) {
  const timeStr = new Date(note.updatedAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  return (
    <button
      onClick={() => onClick(note)}
      className="block w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-colors text-left"
    >
      <div className="font-semibold text-gray-800 text-sm truncate">{note.title}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-gray-500">{timeStr}</span>
        {tags?.map((tag) => (
          <TagBadge key={tag.id} name={tag.name} />
        ))}
      </div>
    </button>
  );
}