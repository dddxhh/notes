import { useState, useCallback, useEffect } from "react";

interface MarkdownEditorProps {
  content: string;
  onUpdate: (mdText: string) => void;
}

export default function MarkdownEditor({ content, onUpdate }: MarkdownEditorProps) {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setLocalContent(newContent);
    },
    []
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      onUpdate(localContent);
    }, 500);
    return () => clearTimeout(timeout);
  }, [localContent]);

  return (
    <textarea
      value={localContent}
      onChange={handleChange}
      className="w-full h-full p-4 font-mono text-sm bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-blue-500"
      placeholder="开始编写 Markdown..."
      spellCheck={false}
    />
  );
}