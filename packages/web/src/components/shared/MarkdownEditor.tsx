import { useState, useCallback, useEffect, useMemo } from "react";
import MarkdownIt from "markdown-it";
import { sanitizeHtml } from "../../lib/dompurify-setup";

interface MarkdownEditorProps {
  content: string;
  onUpdate: (mdText: string) => void;
  preview?: boolean;
}

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

md.enable(["table", "strikethrough", "linkify"]);

export default function MarkdownEditor({ content, onUpdate, preview }: MarkdownEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const [showPreview, setShowPreview] = useState(preview ?? false);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onUpdate(localContent);
    }, 500);
    return () => clearTimeout(timeout);
  }, [localContent]);

  const renderedHtml = useMemo(() => {
    if (!showPreview) return "";
    const rawHtml = md.render(localContent);
    return sanitizeHtml(rawHtml);
  }, [localContent, showPreview]);

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-2 px-2 py-1 border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <button
          onClick={() => setShowPreview(false)}
          className={`px-2 py-1 text-xs rounded ${!showPreview ? "font-bold" : ""}`}
          style={{
            color: showPreview ? "var(--text-secondary)" : "var(--text-primary)",
            backgroundColor: !showPreview ? "var(--bg-tertiary)" : "transparent",
          }}
        >
          源码
        </button>
        <button
          onClick={() => setShowPreview(true)}
          className={`px-2 py-1 text-xs rounded ${showPreview ? "font-bold" : ""}`}
          style={{
            color: !showPreview ? "var(--text-secondary)" : "var(--text-primary)",
            backgroundColor: showPreview ? "var(--bg-tertiary)" : "transparent",
          }}
        >
          预览
        </button>
      </div>
      {showPreview ? (
        <div
          className="markdown-preview flex-1 min-h-0 overflow-auto p-4 prose prose-sm max-w-none"
          style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      ) : (
        <textarea
          value={localContent}
          onChange={handleChange}
          className="flex-1 min-h-0 w-full p-4 font-mono text-sm resize-none focus:outline-none"
          style={{
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "0.5rem",
          }}
          placeholder="开始编写 Markdown..."
          spellCheck={false}
        />
      )}
    </div>
  );
}
