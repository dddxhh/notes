import { useUIStore } from "../../stores";

export default function ModeToggle() {
  const editorMode = useUIStore((s) => s.editorMode);
  const setEditorMode = useUIStore((s) => s.setEditorMode);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setEditorMode("wysiwyg")}
        className="px-3 py-1 rounded text-sm transition-colors"
        style={
          editorMode === "wysiwyg"
            ? { backgroundColor: "var(--accent)", color: "white" }
            : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }
        }
      >
        富文本
      </button>
      <button
        onClick={() => setEditorMode("markdown")}
        className="px-3 py-1 rounded text-sm transition-colors"
        style={
          editorMode === "markdown"
            ? { backgroundColor: "var(--accent)", color: "white" }
            : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }
        }
      >
        Markdown
      </button>
    </div>
  );
}
