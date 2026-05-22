import { useUIStore } from "../../stores";

export default function ModeToggle() {
  const editorMode = useUIStore((s) => s.editorMode);
  const setEditorMode = useUIStore((s) => s.setEditorMode);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setEditorMode("wysiwyg")}
        className={`px-3 py-1 rounded text-sm ${
          editorMode === "wysiwyg"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        所见即所得
      </button>
      <button
        onClick={() => setEditorMode("markdown")}
        className={`px-3 py-1 rounded text-sm ${
          editorMode === "markdown"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        Markdown
      </button>
    </div>
  );
}