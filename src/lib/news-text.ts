/**
 * News text cleanup.
 *
 * The stored `title`/`summary` are other people's commit messages, release notes
 * and Reddit posts, and the page rendered them verbatim: measured on the served
 * snapshot, a llama.cpp item was titled `b11699` (a build tag) while its summary
 * repeated the commit subject twice inside 200 characters, and summaries carried
 * raw URLs into a 280-character `slice` that cut mid-link.
 */

const MARKDOWN_LINK = /\[([^\]]{0,120})\]\(([^)\s]+)\)/g;
const BARE_URL = /\bhttps?:\/\/[^\s<>"')]+/gi;
/** Commit-style issue references such as "(#21752)" also mark where a subject ends. */
const ISSUE_REF = /\s*\((?:#|GH-)\d+\)/gi;
const TRAILING_REF = /\s*(?:#\d+|\(#\d+\))\s*$/;
/** A build tag such as `b11699`, `v1.2.3` or `2026.10.16` says nothing to a reader. */
const BUILD_TAG = /^(?:[a-z]{0,3}[-_.]?)?\d{3,}(?:[-_.]\d+)*$/i;
/** The same tag in front of a real subject: `b11700: model : Granite Switch Decision`. */
const BUILD_TAG_PREFIX = /^(?:[a-z]{0,3}[-_.]?)?\d{3,}(?:[-_.]\d+)*\s*[:–-]\s*/i;
/** After a URL is removed, "… behind a proxy. See" is left dangling. */
const DANGLING_LABEL = /\s*\b(?:see|source|link|ref|refs|repo|code)\s*:?\s*\.?\s*$/i;

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Markdown links keep their label; bare URLs disappear (the card links the source). */
export function stripUrls(text: string): string {
  return collapseWhitespace(text.replace(MARKDOWN_LINK, "$1").replace(BARE_URL, ""));
}

/**
 * `SUBJECT SUBJECT body` is a real pattern in this feed (release notes store the
 * subject twice). When the opening chunk reappears early, the text starts at the
 * repeat so the reader sees the subject once.
 */
export function dedupeRepeatedPrefix(text: string, chunk = 32, maxOffset = 220): string {
  const opening = text.slice(0, chunk).trimEnd();
  if (opening.length < 20) return text;
  const repeat = text.indexOf(opening, 10);
  return repeat > 0 && repeat < maxOffset ? text.slice(repeat) : text;
}

/** Truncation that never cuts a word in half. */
export function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const boundary = slice.lastIndexOf(" ");
  const cut = boundary > maxChars * 0.6 ? slice.slice(0, boundary) : slice;
  return `${cut.replace(/[\s,;:.\-–/]+$/, "")}…`;
}

export interface NewsTextItem {
  kind: string;
  title: string;
  summary?: string | null;
}

/** True when the stored title is only a build/release tag worth showing separately. */
export function isBuildTag(title: string): boolean {
  return BUILD_TAG.test(collapseWhitespace(title ?? ""));
}

/**
 * The subject line inside a body of text: everything before an issue reference,
 * otherwise the first sentence. This is how a build tag gets a real headline.
 */
export function subjectOf(text: string, maxChars = 120): string {
  ISSUE_REF.lastIndex = 0;
  const ref = ISSUE_REF.exec(text);
  /* A subject shorter than eight characters is not worth the cut ("fix (#1)"). */
  if (ref && ref.index >= 8) return truncateAtWord(text.slice(0, ref.index).trim(), maxChars);
  const sentence = text.split(/(?<=[.!?])\s+/)[0] ?? text;
  return truncateAtWord(sentence.trim(), maxChars);
}

function tidyBody(text: string): string {
  return collapseWhitespace(text.replace(DANGLING_LABEL, "")).replace(/^[\s:–-]+/, "");
}

/**
 * One call for both halves: the cleaned body is computed once, the headline is
 * derived from it when the stored title is unusable, and the headline is then
 * removed from the top of the body so it is never printed twice.
 */
export function newsText(item: NewsTextItem, options: { titleMax?: number; bodyMax?: number } = {}): {
  title: string;
  body: string;
  buildTag: string | null;
} {
  const titleMax = options.titleMax ?? 120;
  const bodyMax = options.bodyMax ?? 600;

  const storedTitle = stripUrls(item.title ?? "").replace(ISSUE_REF, " ").trim().replace(TRAILING_REF, "").trim();
  const tag = isBuildTag(storedTitle) ? storedTitle : null;
  /* `b11700: model : Granite Switch Decision` is a real subject behind a build
     tag: strip the tag, show it as the secondary label, keep the subject. */
  const prefixMatch = tag ? null : storedTitle.match(BUILD_TAG_PREFIX);
  const prefixRaw = prefixMatch?.[0] ?? null;
  const bareTitle = prefixRaw ? storedTitle.slice(prefixRaw.length).trim() : storedTitle;
  const effectiveTitle = bareTitle.length >= 12 ? bareTitle : storedTitle;
  const buildTag = tag ?? (prefixRaw ? prefixRaw.replace(/[\s:–-]+$/, "") : null);

  /* The subject is read before the duplicate is collapsed: the issue reference
     that marks the subject's end belongs to the *first* copy, which dedupe drops. */
  const raw = stripUrls(item.summary ?? "");
  const titleIsUseless = Boolean(tag) || effectiveTitle.length === 0 || /^[#\d\s.,-]+$/.test(effectiveTitle);

  const headline = titleIsUseless ? subjectOf(raw, titleMax) : truncateAtWord(effectiveTitle, titleMax);

  let body = tidyBody(dedupeRepeatedPrefix(raw));
  if (headline.length >= 20 && body.toLowerCase().startsWith(headline.toLowerCase())) {
    body = body.slice(headline.length);
  } else if (storedTitle.length >= 20 && body.toLowerCase().startsWith(storedTitle.toLowerCase())) {
    body = body.slice(storedTitle.length);
  }

  return { title: headline, body: truncateAtWord(tidyBody(body), bodyMax), buildTag };
}
