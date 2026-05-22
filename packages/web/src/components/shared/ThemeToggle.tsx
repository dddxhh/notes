import { useTheme } from "../../hooks/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "切换浅色模式" : "切换深色模式"}
      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
