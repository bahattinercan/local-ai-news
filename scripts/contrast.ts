/**
 * Contrast audit of the design tokens, read from `src/app/globals.css`.
 *
 *   npx tsx scripts/contrast.ts
 *
 * The point of reading the stylesheet instead of a copy pasted into this file is
 * that it cannot go stale: change a ramp, run this, and the table describes the
 * new one. Exits non-zero when a pair that must pass WCAG 2.x AA fails, so it can
 * gate a token change (docs/en/DESIGN-V3.md §4).
 *
 * Every ratio is WCAG 2.x relative luminance over the *rendered* colours — a
 * muted text colour is checked against both the page background and the panel it
 * sits on, because a colour can pass on one and fail on the other.
 */
import { readFileSync } from "node:fs";

const CSS = readFileSync("src/app/globals.css", "utf-8");

/** The two theme blocks, keyed by the attribute the stylesheet selects on. */
function tokenBlock(selector: string): Record<string, string> {
  const pattern = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const body = CSS.match(pattern)?.[1];
  if (!body) throw new Error(`no token block found for ${selector} in globals.css`);

  const tokens: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const match = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (!match) continue;
    const value = match[2].trim();
    /* `color-mix()` and `rgba()` are washes/shadows, not text colours. */
    if (/^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(value)) tokens[match[1]] = value;
  }
  return tokens;
}

function hex(value: string): string {
  const raw = value.replace("#", "");
  return raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
}

function luminance(value: string): number {
  const channels = [0, 2, 4].map((index) => parseInt(hex(value).slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

interface Pair {
  /** `null` means the pair is informational — printed, never gated. */
  min: number | null;
  foreground: string;
  background: string;
  note: string;
}

const PAIRS: Pair[] = [
  { min: 4.5, foreground: "--muted", background: "--bg", note: "secondary text on the page" },
  { min: 4.5, foreground: "--muted", background: "--surface", note: "secondary text inside a panel" },
  { min: 7, foreground: "--text", background: "--bg", note: "body text" },
  { min: 7, foreground: "--text", background: "--surface", note: "body text inside a panel" },
  { min: 4.5, foreground: "--accent", background: "--bg", note: "accent text/links" },
  { min: 4.5, foreground: "--accent", background: "--surface", note: "accent inside a panel" },
  { min: 4.5, foreground: "--accent-2", background: "--bg", note: "link/visited accent" },
  { min: 4.5, foreground: "--ok", background: "--bg", note: "positive state" },
  { min: 4.5, foreground: "--warn", background: "--bg", note: "warning state" },
  { min: 4.5, foreground: "--danger", background: "--bg", note: "danger state" },
  { min: 3, foreground: "--rule-strong", background: "--bg", note: "section rule (non-text)" },
  { min: 3, foreground: "--control", background: "--bg", note: "control boundary (non-text)" },
  { min: 3, foreground: "--control", background: "--surface", note: "control boundary in a panel" },
  { min: 1.4, foreground: "--rule", background: "--bg", note: "hairline (decorative)" },
  { min: 1.4, foreground: "--rule", background: "--surface", note: "hairline in a panel" },
  { min: 4.5, foreground: "--text", background: "--ribbon", note: "ink on the ribbon wash" },
  { min: 4.5, foreground: "--text", background: "--promo", note: "ink on the tinted box" },
  { min: null, foreground: "--surface", background: "--bg", note: "panel vs page (informational)" },
  { min: null, foreground: "--raised", background: "--surface", note: "raised vs panel (informational)" }
];

const themes: Array<[string, string]> = [
  ["paper", ":root"],
  ["night", '\\[data-theme="dark"\\]']
];

let failures = 0;
for (const [theme, selector] of themes) {
  const tokens = tokenBlock(selector);
  console.log(`\n${theme.toUpperCase()} (${selector})`);
  for (const pair of PAIRS) {
    const foreground = tokens[pair.foreground];
    const background = tokens[pair.background];
    if (!foreground || !background) {
      console.log(`  ${pair.foreground} / ${pair.background}: tokens missing — skipped`);
      continue;
    }
    const ratio = contrast(foreground, background);
    const verdict = pair.min === null ? "info" : ratio >= pair.min ? "pass" : `FAIL (needs ${pair.min})`;
    if (verdict.startsWith("FAIL")) failures += 1;
    console.log(
      `  ${`${pair.foreground} / ${pair.background}`.padEnd(30)} ${ratio.toFixed(2).padStart(6)}  ${verdict.padEnd(16)} ${pair.note}`
    );
  }
}

console.log(failures === 0 ? "\nall gated pairs pass\n" : `\n${failures} pair(s) below target\n`);
process.exit(failures === 0 ? 0 : 1);
