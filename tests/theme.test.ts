import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_THEME, THEME_BOOTSTRAP, THEME_KEY, storedTheme } from "../src/lib/theme.ts";

/**
 * The theme has two writers that must agree: the `<head>` bootstrap string (which
 * runs before the first paint, so a hard load never flashes paper at a reader who
 * chose the night edition) and React (`ThemeSync` + the toggle, which re-assert
 * the choice after a language switch remounts the root layout, see
 * `scripts/check-theme.ts`). They can only agree if they read the same key —
 * hence this test, which pins the contract instead of the implementation.
 */

test("paper is the default theme", () => {
  assert.equal(DEFAULT_THEME, "light");
});

test("the bootstrap script reads the key the toggle writes", () => {
  assert.ok(
    THEME_BOOTSTRAP.includes(`localStorage.getItem("${THEME_KEY}")`),
    `bootstrap must read "${THEME_KEY}": ${THEME_BOOTSTRAP}`
  );
});

test("the bootstrap defaults to paper and never consults the OS", () => {
  /* A reader who never chose must land on paper (docs/en/DESIGN-V3.md D2), and
     `prefers-color-scheme` must not be consulted: on a print design "the
     operating system prefers dark" is not a request for the night edition. */
  assert.ok(THEME_BOOTSTRAP.includes(`s==="dark"?"dark":"light"`));
  assert.ok(!THEME_BOOTSTRAP.includes("matchMedia"));
});

test("a browser without storage still resolves to a theme", () => {
  /* `localStorage` throws in a sandboxed frame or with storage turned off. Both
     the bootstrap script and `storedTheme` swallow it rather than take the page
     down, so the answer is always one of the two known values. */
  const theme = storedTheme();
  assert.ok(theme === "light" || theme === "dark", `unexpected theme ${theme}`);
});
