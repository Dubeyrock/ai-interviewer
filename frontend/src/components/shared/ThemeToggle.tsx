import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="
        inline-flex items-center justify-center
        h-10 w-10
        rounded-xl
        border
        border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-900
        text-slate-700 dark:text-slate-200
        shadow-sm
        hover:scale-105
        transition
      "
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
};

export default ThemeToggle;