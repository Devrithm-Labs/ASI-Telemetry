"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-8 w-8 rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-100 dark:bg-[#0a0a0a] ${className || ""}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`group relative flex h-8 items-center gap-2 rounded-lg border border-slate-200 dark:border-[#1e293b] bg-slate-50 hover:bg-slate-100 dark:bg-[#0a0a0a] dark:hover:bg-[#141414] px-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all select-none shadow-sm hover:border-blue-500/50 ${className || ""}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400 transition-transform group-hover:rotate-45" />
          <span className="hidden sm:inline font-medium">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-blue-600 transition-transform group-hover:-rotate-12" />
          <span className="hidden sm:inline font-medium">Dark</span>
        </>
      )}
    </button>
  );
}
