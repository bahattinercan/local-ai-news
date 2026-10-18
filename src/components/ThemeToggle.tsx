"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "owr.theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<string>("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme ?? "dark";
    setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-11 w-11 shrink-0 items-center justify-center border border-rule bg-surface text-muted hover:border-rule-strong hover:text-text"
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
