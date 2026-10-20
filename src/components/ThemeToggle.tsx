"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, useToggleTheme } from "@/lib/useTheme";

/**
 * The night-edition switch.
 *
 * It renders from the shared store (`lib/useTheme`), not from the document:
 * after a language switch the root layout remounts and React resets
 * `data-theme` to the server's `light` before this component's first render, so
 * a `useEffect` that sniffed the DOM reported "paper" to a reader who chose ink
 * and offered them the wrong icon. `ThemeSync` owns the document now.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const toggle = useToggleTheme();
  const night = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-11 w-11 shrink-0 items-center justify-center border border-rule bg-surface text-muted hover:border-rule-strong hover:text-text"
      aria-label={night ? "Switch to light theme" : "Switch to dark theme"}
    >
      {night ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}
