"use client";

import { useSyncExternalStore } from "react";
import {
  applyTheme,
  DEFAULT_THEME,
  notifyTheme,
  storedTheme,
  subscribeTheme,
  type Theme
} from "@/lib/theme";

/**
 * The reader's theme, shared by the toggle and by `ThemeSync`.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the value is not
 * owned by any component, and both consumers must agree on it in the *first*
 * render after a remount - a `useEffect` that reads the DOM would race the
 * remount that just overwrote it.
 */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, storedTheme, serverTheme);
}

/** Paper: what the server rendered, since it cannot know the reader's choice. */
function serverTheme(): Theme {
  return DEFAULT_THEME;
}

export function useToggleTheme(): () => void {
  const theme = useTheme();
  return () => {
    applyTheme(theme === "dark" ? "light" : "dark");
    notifyTheme();
  };
}
