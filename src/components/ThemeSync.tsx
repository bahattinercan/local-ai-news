"use client";

import { useLayoutEffect } from "react";
import { useTheme } from "@/lib/useTheme";

/**
 * Keeps `<html data-theme>` equal to the reader's saved choice (`lib/theme.ts`
 * explains the remount that used to drop it).
 *
 * `useLayoutEffect` timing is the point, not a detail: React re-writes
 * `data-theme="light"` from the RSC payload *while* mounting, so a passive
 * `useEffect` would let one frame of paper reach a reader reading at night. A
 * layout effect runs in the same commit, before the browser paints.
 */
export function ThemeSync() {
  const theme = useTheme();

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
