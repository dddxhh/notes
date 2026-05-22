import { type Editor } from "@tiptap/react";
import ImageUploadButton from "./ImageUploadButton";
import VideoUploadButton from "./VideoUploadButton";
import { useAttachmentUpload } from "../../hooks/useAttachmentUpload";
import { createAttachmentSrc } from "../../lib/attachment-protocol";
import { HIGHLIGHT_LANGUAGES } from "../../lib/highlight-languages";

interface EditorToolbarProps {
  editor: Editor;
  noteId?: string;
}

export default function EditorToolbar({ editor, noteId = "" }: EditorToolbarProps) {
  if (!editor) return null;

  const { uploadFile } = useAttachmentUpload(noteId);

  const handleImageUpload = async (file: File) => {
    const result = await uploadFile(file);
    if (result.success && result.attachment) {
      editor.commands.setCustomImage({ src: createAttachmentSrc(result.attachment.id) });
    }
  };

  const handleVideoUpload = async (file: File) => {
    const result = await uploadFile(file);
    if (result.success && result.attachment) {
      editor.commands.setCustomVideo({ src: createAttachmentSrc(result.attachment.id) });
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-1 rounded text-sm font-bold ${
          editor.isActive("bold") ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="粗体"
      >
        B
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-1 rounded text-sm italic ${
          editor.isActive("italic") ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="斜体"
      >
        I
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-2 py-1 rounded text-sm ${
          editor.isActive("heading", { level: 1 }) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="标题1"
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 rounded text-sm ${
          editor.isActive("heading", { level: 2 }) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="标题2"
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-2 py-1 rounded text-sm ${
          editor.isActive("bulletList") ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="无序列表"
      >
        • 列表
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-2 py-1 rounded text-sm ${
          editor.isActive("orderedList") ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="有序列表"
      >
        1. 列表
      </button>
      <button
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={`px-2 py-1 rounded text-sm ${
          editor.isActive("taskList") ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="任务列表"
      >
        ☑ 任务
      </button>
      <button
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        className={`px-2 py-1 rounded text-sm ${
          editor.isActive("table") ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="插入表格"
      >
        ⊞ 表格
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`px-2 py-1 rounded text-sm ${
          editor.isActive("codeBlock") ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
        title="代码块"
      >
        {"{}"}代码
      </button>
      <select
        value={editor.getAttributes("codeBlock").language || ""}
        onChange={(e) => {
          const lang = e.target.value;
          editor.chain().focus().updateAttributes("codeBlock", { language: lang }).run();
        }}
        className={`px-1 py-1 rounded text-sm border ${
          editor.isActive("codeBlock") ? "border-blue-300" : "border-gray-300 bg-white text-gray-500"
        }`}
        title="代码语言"
        disabled={!editor.isActive("codeBlock")}
      >
        <option value="">自动</option>
        {HIGHLIGHT_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>
      <ImageUploadButton onFileSelected={handleImageUpload} />
      <VideoUploadButton onFileSelected={handleVideoUpload} />
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-gray-500">
          {editor.storage.characterCount?.characters() ?? 0} 字
        </span>
      </div>
    </div>
  );
}