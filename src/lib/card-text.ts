/**
 * The model page had no sentence about the model itself: the ingest only stored
 * structured `cardData` keys (`baseModel`, `datasets`, `languages`), which are
 * empty on most repositories — `nerkyor/Qwen3.8-27B-…-Ninfer` shipped a page of
 * numbers, a run command and no description at all.
 *
 * The Hugging Face model card body (the README behind `/{repo}/raw/main/README.md`)
 * is the one piece of prose that exists for nearly every repository, but it is
 * Markdown written for a different renderer: a YAML frontmatter block, badge
 * image rows, HTML `<div align="center">` wrappers, tables of benchmark scores and
 * fenced code blocks. Republishing that raw would break the page, so this module
 * turns it into a short plain-text excerpt — a pure function, unit-testable
 * without the network, and deliberately lossy: attribution plus a link to the
 * original, never the article.
 */

/** Long enough to say something, short enough to stay one paragraph on a card. */
export const CARD_EXCERPT_MAX = 600;

/** Below this a "card" is a badge wall or a title: not worth a section. */
const MIN_USEFUL_EXCERPT = 24;

function stripFrontmatter(markdown: string): string {
  const normalised = markdown.replace(/\r\n/g, "\n");
  // A leading blank line or BOM defeats `startsWith("---")`: the card at
  // `realrebelai/MOSS-Imagine_ComfyUI` begins with `\n---`, and the YAML then
  // leaked into the excerpt as prose (`tags: diffusers comfyui moss-image …`).
  const trimmed = normalised.replace(/^\uFEFF/, "").replace(/^(?:[ \t]*\n)+/, "");
  if (!trimmed.startsWith("---")) return trimmed;
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return trimmed;
  const after = trimmed.indexOf("\n", end + 1);
  return after === -1 ? "" : trimmed.slice(after + 1);
}

/**
 * YAML frontmatter values are metadata, not prose, but they can leak through a
 * malformed block (`license: apache-2.0` with no closing `---`).
 */
const FRONTMATTER_LIKE = /^[a-z_][a-z0-9_]*:\s*\S/i;

function isBoilerplate(line: string): boolean {
  return (
    line === "" ||
    FRONTMATTER_LIKE.test(line) ||
    /^https?:\/\//i.test(line) ||
    /^[-=*_]{2,}$/.test(line) ||
    /^<\/?[a-z!]/i.test(line)
  );
}

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&amp;": "&"
};

function decodeEntities(text: string): string {
  // `&amp;` last so `&amp;lt;` cannot become `<` in one pass.
  return Object.entries(ENTITIES).reduce((value, [entity, char]) => value.split(entity).join(char), text);
}

/**
 * Paper cards open with the author and affiliation block, which is not an
 * explanation of the model: `Zhengming Yu<sup>1,2</sup>, Junkun Yuan<sup>2</sup>, …`
 * plus `1Texas A&M University, 2ByteDance`. It is dropped, but only while it is
 * leading — the moment a line reads like prose, dropping stops, so a card that
 * opens with a real sentence keeps it.
 */
function looksLikeAuthorBlock(line: string): boolean {
  if (/[.!?]$/.test(line)) return false;
  // Trailing commas are how an author list is written across lines, so the empty
  // segment they leave behind must not disqualify the line — and a *single* name
  // ending in a comma is only ever a continuation of that list.
  const segments = line
    .split(",")
    .map((segment) => segment.trim())
    .filter((segment) => segment !== "");
  if (segments.length === 0) return false;
  if (segments.length === 1) {
    // A single name is an author when it is written as a continuation of the list
    // (`Chongyang Ma 2,`) or carries the superscript marker the last one does
    // (`Chongyang Ma 2` — the `<br/>` after it removed the comma).
    const short = segments[0].length <= 36 && /^[A-Z0-9]/.test(segments[0]);
    return short && (/,$/.test(line) || /\s\d{1,2}$/.test(line));
  }
  return segments.every((segment) => segment.length <= 36 && /^[A-Z0-9]/.test(segment));
}

function cleanLine(raw: string): string {
  let line = raw.trim();
  // Headings are dropped: the page already prints the repo id as its `<h1>`, and
  // an excerpt that opens with the model's name says nothing.
  if (/^#{1,6}\s/.test(line)) return "";
  // Badges: `[![alt](img)](link)` rows survive image/link stripping as `[]()`,
  // so they are removed before those rules run.
  line = line.replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, " ");
  line = line.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  line = line.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Inline HTML: `<sup>1,2</sup>`, `<br/>`, `<div align="center">`.
  line = line.replace(/<[^>]*>/g, " ");
  line = decodeEntities(line);
  line = line.replace(/^>\s*/, "");
  line = line.replace(/^(?:[-*+]|\d+\.)\s+/, "");
  line = line.replace(/^#{1,6}\s*/, "");
  // Table rows and rules: a benchmark table flattened into one line is noise.
  if (/^\|/.test(line) || /^:?-{3,}/.test(line)) return "";
  line = line.replace(/[*_`~]/g, "");
  line = line.replace(/\s+/g, " ").trim();
  if (line === "" || isBoilerplate(line)) return "";
  // A line with no letters at all (a bare score, a pipe table remnant) is noise.
  if (!/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(line)) return "";
  if (line.length < 4) return "";
  return line;
}

/**
 * Markdown → one plain paragraph. Fenced code is removed whole (a `pip install`
 * block is not an explanation), then the remaining lines are cleaned one by one
 * and joined.
 */
export function markdownToText(markdown: string): string {
  const withoutCode = stripFrontmatter(markdown).replace(/```[\s\S]*?```/g, "\n");
  const withoutComments = withoutCode.replace(/<!--[\s\S]*?-->/g, "\n");
  const lines = withoutComments
    .split("\n")
    .map(cleanLine)
    .filter((line) => line !== "");
  while (lines.length > 0 && looksLikeAuthorBlock(lines[0])) lines.shift();
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

/** Clamp at a word boundary so an excerpt never cuts a word in half. */
export function clampWords(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.·-]+$/, "");
  return `${trimmed} …`;
}

/**
 * The excerpt stored on the model row. `null` (not `undefined`) means "the card
 * was read and held nothing printable": the ingest backfill keys on `undefined`
 * so a model with an empty card is never fetched twice.
 */
export function cardExcerpt(markdown: string, max = CARD_EXCERPT_MAX): string | null {
  const text = markdownToText(markdown);
  if (text.length < MIN_USEFUL_EXCERPT) return null;
  return clampWords(text, max);
}
