/**
 * The night edition's one source of truth.
 *
 * `data-theme` lives on `<html>`, which is rendered by the root layout — and the
 * root layout is `app/[locale]/layout.tsx`, so **switching the language remounts
 * it**. Next.js re-writes every attribute on `<html>` from the RSC payload on that
 * remount, and the payload can only ever say `data-theme="light"` (the server does
 * not know the reader's choice). The bootstrap script in `<head>` does not save
 * us either: it is rendered through `dangerouslySetInnerHTML`, so on a client
 * remount React assigns it as markup and it never executes again.
 *
 * Measured 2026-10-20 with `scripts/check-theme.ts`: in the night edition,
 * clicking TR/EN reset the document to paper while `localStorage` still said
 * `dark` — the reader's choice survived, the page did not.
 *
 * So the choice is re-applied on **every** mount (see `ThemeSync`), and the
 * toggle and the sync read the same store instead of the DOM.
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "owr.theme";

/** Paper is the default (docs/en/DESIGN-V3.md D2); dark is opt-in. */
export const DEFAULT_THEME: Theme = "light";

/** The reader's saved choice, or the default when storage is unavailable. */
export function storedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return DEFAULT_THEME;
  }
}

/** Write the theme to the document and remember it. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable: the choice lives for this document only */
  }
}

const listeners = new Set<() => void>();

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  /* Another tab is the same reader: keep the two editions in step. */
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function notifyTheme(): void {
  for (const listener of listeners) listener();
}

/**
 * Read before the first paint, so a hard load never flashes paper at a reader
 * who chose the night edition (`ThemeSync` hands the same value to React).
 */
export const THEME_BOOTSTRAP = `try{var s=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=s==="dark"?"dark":"light";}catch(e){}`;
