import { useState } from "react";

interface MobileFABProps {
  onNewNote?: () => void;
  onUpload?: () => void;
}

export default function MobileFAB({ onNewNote, onUpload }: MobileFABProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    setExpanded((prev) => !prev);
  };

  const handleNewNote = () => {
    setExpanded(false);
    onNewNote?.();
  };

  const handleUpload = () => {
    setExpanded(false);
    onUpload?.();
  };

  return (
    <div data-testid="mobile-fab" className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-2">
      {expanded && (
        <div className="flex flex-col gap-2 mb-2 animate-fade-in">
          <button
            onClick={handleNewNote}
            aria-label="新建笔记"
            className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm"
            style={{ backgroundColor: "var(--accent)", color: "white" }}
          >
            📝 新建笔记
          </button>
          <button
            onClick={handleUpload}
            aria-label="上传文件"
            className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm"
            style={{ backgroundColor: "var(--accent)", color: "white" }}
          >
            📎 上传
          </button>
        </div>
      )}
      <button
        onClick={handleClick}
        aria-label="新建"
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl"
        style={{ backgroundColor: "var(--accent)", color: "white" }}
      >
        {expanded ? "✕" : "+"}
      </button>
    </div>
  );
}