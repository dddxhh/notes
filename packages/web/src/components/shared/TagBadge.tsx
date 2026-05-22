interface TagBadgeProps {
  name: string;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

export default function TagBadge({ name, onClick, removable, onRemove }: TagBadgeProps) {
  return (
    <span
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200"
    >
      #{name}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="text-blue-500 hover:text-red-500 ml-0.5"
        >
          ×
        </button>
      )}
    </span>
  );
}