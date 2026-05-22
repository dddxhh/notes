import { useRef } from "react";

interface ImageUploadButtonProps {
  onFileSelected: (file: File) => void;
  className?: string;
}

export default function ImageUploadButton({ onFileSelected, className }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleClick = () => inputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };
  return (
    <>
      <button onClick={handleClick} className={className || "toolbar-btn"} title="插入图片">
        🖼
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </>
  );
}
