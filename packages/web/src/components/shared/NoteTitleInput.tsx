import { useState, useRef, useCallback, useEffect } from "react";

interface NoteTitleInputProps {
  value: string;
  onChange: (title: string) => void;
  placeholder?: string;
}

export default function NoteTitleInput({
  value,
  onChange,
  placeholder = "输入标题...",
}: NoteTitleInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(newValue), 300);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onChange(localValue);
        const proseMirrorEl = document.querySelector(".ProseMirror") as HTMLElement | null;
        if (proseMirrorEl) {
          proseMirrorEl.focus();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setLocalValue(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        inputRef.current?.blur();
      }
    },
    [value, onChange, localValue],
  );

  return (
    <input
      ref={inputRef}
      type="text"
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="note-title-input flex-1 min-w-0 text-lg font-semibold outline-none"
      style={{ color: "var(--text-primary)" }}
    />
  );
}
