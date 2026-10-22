import type { Metadata } from "next";
import { CATEGORY_RULES, categoryLabel } from "@/lib/classify/rules";
import { formatCount, formatEditionDate } from "@/lib/format";
import { newsText, truncateAtWord } from "@/lib/news-text";
import { formatParams } from "@/lib/runner/vram";
import type { ClassifiedModel } from "@/lib/model";
import type { SnapshotNews } from "@/lib/store";
import type { Locale } from "@/i18n";

/**
 * The single place that decides what a crawler is told (docs/en/SEO-PLAN.md §4).
 *
 * Before this module existed, every route inherited the root layout's one title
 * and description and no route emitted a canonical, an alternate or an OG tag.
 * The rule is now: a page's metadata is derived from the page's own data, and
 * the helpers here are pure so the title/description builders can be unit-tested
 * without a server.
 */

/**
 * Decision Q1 (docs/en/SEO-PLAN.md §14, v3): no custom domain will be used.
 * The brand domain was never attached, so the public origin is the deployed
 * Vercel host and the code default has to say the same thing as production.
 */
export const FALLBACK_SITE_URL = "https://local-ai-news.vercel.app";

/** Read once per server process; `.env` is the only place the origin can differ. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL).replace(/\/+$/, "");

export const SITE_NAME = "OpenWeight Radar";

/** Normalise a locale-relative path into the absolute canonical URL. */
export function canonicalUrl(locale: Locale, path: string): string {
  const clean = path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}/${locale}${clean}`;
}

/**
 * `en`, `tr` and `x-default`. Every indexable page in this site exists in both
 * locales and the entity slug is identical, so the path alone is enough.
 * `x-default` points at EN, which is the source of truth for entity facts.
 */
export function languageAlternates(path: string, query = ""): Record<string, string> {
  const clean = path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  const suffix = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return {
    en: `${SITE_URL}/en${clean}${suffix}`,
    tr: `${SITE_URL}/tr${clean}${suffix}`,
    "x-default": `${SITE_URL}/en${clean}${suffix}`
  };
}

/* ------------------------------------------------------------- index policy -- */

const SPEC_KEYS = [
  "paramsTotal",
  "license",
  "libraryName",
  "storageBytes",
  "vramEstGb",
  "files",
  "quantizations",
  "runners"
] as const;

function present(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim() !== "";
  return true;
}

/** How many of the eight local-fit fields this model actually reports. */
export function specCount(model: ClassifiedModel): number {
  return SPEC_KEYS.filter((key) => present(model[key])).length;
}

/** Four reported specs, or 200 characters of card prose, for a gate-passed model. */
const SPEC_FLOOR = 4;

/**
 * Decision Q5 (docs/en/SEO-PLAN.md §14, v3): a model that reports six or more of
 * the eight spec fields is indexable **even if it failed the quality gate**. Six
 * facts make a page that answers a real question, and the gate's job is to keep
 * empty rows out, not to overrule a row the source actually filled in.
 */
const SPEC_ALWAYS_INDEXABLE = 6;

/**
 * Decision S4 plus Q5: a gate-passed model with enough specs - or, after the
 * card backfill, enough prose - is worth indexing, and so is any model that
 * reports six or more specs regardless of the gate. Everything else stays
 * reachable but `noindex, follow`, so the site never ships near-empty pages.
 *
 * Measured on the committed `data/feed.json` snapshot (2026-10-14, 915 models):
 * the pre-Q5 predicate admits 251 models, Q5 lifts that to 252 - one gate-failed
 * row with seven reported specs. Sitemap URLs therefore move 792 → 794 across
 * the two locales. (§15.1 measured 1 402 models in production; this snapshot is
 * the smaller offline denominator the audit and the tests run against.)
 */
export function isIndexableModel(model: ClassifiedModel): boolean {
  const specs = specCount(model);
  if (specs >= SPEC_ALWAYS_INDEXABLE) return true;
  return model.qualityPassed && (specs >= SPEC_FLOOR || (model.cardSummary?.trim().length ?? 0) >= 200);
}

/* ---------------------------------------------------------- crawler policy -- */

/**
 * Decision Q2 (docs/en/SEO-PLAN.md §14, v3): "allow search only". These agents
 * train on the content, or fetch it to answer without a citation and a link, so
 * `src/app/robots.ts` denies them the whole site. Kept here, not in the route
 * file, because `scripts/seo-audit.ts` and the robots tests assert the same list.
 */
export const TRAINING_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "CCBot",
  "Bytespider",
  "Applebot-Extended",
  "meta-externalagent",
  "cohere-ai",
  "Diffbot"
] as const;

/**
 * The one judgement call in Q2: PerplexityBot and OAI-SearchBot build an answer
 * index that cites and links the page it read, which is what a search engine
 * does. They stay allowed; adding either name to the list above flips them.
 */
export const ANSWER_ENGINE_CRAWLERS = ["PerplexityBot", "OAI-SearchBot"] as const;

/** Classic search crawlers. The wildcard rule must keep serving all of them. */
export const SEARCH_CRAWLERS = ["Googlebot", "Bingbot", "DuckDuckBot", "Applebot", "YandexBot"] as const;

/** A paper with a stub summary is not a document; everything else is. */
export function isIndexableNews(item: SnapshotNews): boolean {
  return item.kind !== "paper" || (item.summary?.trim().length ?? 0) >= 300;
}

/* ---------------------------------------------------------------- builders -- */

/**
 * A one-word category for titles, because "language / llm" is not a noun. These
 * are taxonomy terms, not UI copy, but the Turkish column is still a translation
 * of the *word* - "görüntü modeli" is what a Turkish reader searches for, while
 * the category label on the desk stays English by decision.
 */
const CATEGORY_WORD: Record<string, { en: string; tr: string }> = {
  llm: { en: "LLM", tr: "LLM" },
  image: { en: "image", tr: "görüntü" },
  video: { en: "video", tr: "video" },
  coding: { en: "coding", tr: "kod" },
  audio: { en: "audio", tr: "ses" },
  multimodal: { en: "multimodal", tr: "çoklu mod" },
  embedding: { en: "embedding", tr: "embedding" },
  vision: { en: "vision", tr: "görü" },
  robotics: { en: "robotics", tr: "robotik" }
};

export function categoryWord(key: string, locale: Locale = "en"): string {
  return CATEGORY_WORD[key]?.[locale] ?? categoryLabel(key).toLowerCase();
}

/**
 * A long repo id is shortened from the **front of the name**, never the end.
 * Two repositories can share the first sixty characters and differ in the last
 * thirty (`…-inv-gen-rlhint-…` vs `…-aug-combine-rlhint-…`), so an end cut made
 * two different pages carry the same `<title>`. The owner stays, the variant
 * tail stays; only the middle of the name is dropped.
 */
function shortModelId(model: ClassifiedModel): string {
  const full = model.externalId;
  if (full.length <= 50) return full;
  const slash = full.indexOf("/");
  const owner = slash > 0 ? full.slice(0, slash) : "";
  const name = slash > 0 ? full.slice(slash + 1) : full;
  const tail = name.slice(-42);
  return owner ? `${owner}/…${tail}` : `…${tail}`;
}

/** 60 characters of entity, then a word boundary, never a hard cut. */
export function modelTitle(model: ClassifiedModel, locale: Locale = "en"): string {
  const params = model.paramsTotal ? formatParams(model.paramsTotal) : null;
  const category = categoryWord(model.primaryCategory, locale);
  /* Cut the id, not the finished title: the tail of a long repo id is where two
     near-identical repos differ, and it must survive next to the descriptor. */
  const id = shortModelId(model);
  if (locale === "tr") {
    return params ? `${id} - ${params} yerel ${category} modeli` : `${id} - yerel ${category} modeli`;
  }
  return params ? `${id} - ${params} local ${category} model` : `${id} - local ${category} model`;
}

/**
 * The description is built from facts that are present, and it says which ones
 * are absent by omission - never "unknown", "null" or a bare dash. License and
 * quantization come before the long-tail facts because they are what a reader
 * deciding whether to run the model actually needs.
 */
export function modelDescription(model: ClassifiedModel, locale: Locale): string {
  const date = formatEditionDate(model.firstSeenAt, locale);
  const category = categoryWord(model.primaryCategory, locale);
  const params = model.paramsTotal ? formatParams(model.paramsTotal) : null;
  const parts: string[] = [];

  if (locale === "tr") {
    parts.push(
      `${model.externalId}, ${date} tarihinde ilk kez görülen ${params ? `${params} ` : ""}${category} modeli.`
    );
    if (model.licenseName || model.license) parts.push(`Lisans: ${model.licenseName ?? model.license}.`);
    if (model.quantizations.length > 0) parts.push(`Kuantizasyon: ${model.quantizations.slice(0, 4).join(", ")}.`);
    if (model.runners.length > 0) parts.push(`Şunlarla çalışır: ${model.runners.slice(0, 3).join(", ")}.`);
    if (model.vramEstGb) parts.push(`~${model.vramEstGb} GB VRAM.`);
  } else {
    parts.push(`${model.externalId} is a ${params ? `${params} ` : ""}${category} model first seen ${date}.`);
    if (model.licenseName || model.license) parts.push(`License: ${model.licenseName ?? model.license}.`);
    if (model.quantizations.length > 0) parts.push(`Quantizations: ${model.quantizations.slice(0, 4).join(", ")}.`);
    if (model.runners.length > 0) parts.push(`Runs with ${model.runners.slice(0, 3).join(", ")}.`);
    if (model.vramEstGb) parts.push(`~${model.vramEstGb} GB VRAM.`);
  }

  const facts = parts.join(" ");
  const summary = model.cardSummary?.trim();
  if (!summary) return truncateAtWord(facts, 160);

  /* The excerpt is a bonus, not the spine: append it only when the facts leave
     room, so a 160-character budget can never cut the license or the quant. */
  const room = 160 - facts.length - 1;
  if (room < 30) return truncateAtWord(facts, 160);
  return truncateAtWord(`${facts} ${truncateAtWord(summary, room)}`, 160);
}

/** The cleaned headline, not the stored build tag. */
export function newsTitle(item: SnapshotNews): string {
  const { title, buildTag } = newsText(item, { titleMax: 90, bodyMax: 80 });
  const base = title || buildTag || item.title || "Update";
  return truncateAtWord(base, 70);
}

/** The summary with URLs removed; the page never republishes the source body. */
export function newsDescription(item: SnapshotNews, locale: Locale): string {
  const { body } = newsText(item, { titleMax: 120, bodyMax: 400 });
  const fallback =
    locale === "tr"
      ? "Hugging Face akışından yerelde çalıştırılabilir açık ağırlıklı modeller ve runtime haberleri."
      : "Open-weight models and runtime news you can run locally, from the Hugging Face feeds.";
  return truncateAtWord(body || item.summary?.trim() || fallback, 160);
}

export function modelPath(model: ClassifiedModel): string {
  return `/m/${model.slug}`;
}

export function newsPath(item: SnapshotNews): string {
  return `/n/${encodeURIComponent(item.externalId)}`;
}

/* ---------------------------------------------------------- list surfaces -- */

export const FEED_FILTER_KEYS = ["window", "sort", "gate", "runner", "maxParams", "license", "q"] as const;

export interface ListMetadataInput {
  path: string;
  raw: Record<string, string | string[] | undefined>;
  /** Query keys that make this surface a tool view rather than a document. */
  filterKeys?: readonly string[];
  /** Whether `?page=N` (with no other query) is a real, indexable document. */
  pageIsIndexable?: boolean;
}

export interface ListMetadata {
  alternates: NonNullable<Metadata["alternates"]>;
  robots?: Metadata["robots"];
}

function single(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw.trim() : "";
}

function hasAny(raw: Record<string, string | string[] | undefined>, keys: readonly string[]): boolean {
  return keys.some((key) => single(raw[key]) !== "");
}

/**
 * Canonical + robots for a list surface.
 *
 * - No query: the bare route is the canonical document.
 * - `?page=N` alone: self-canonical and indexable (pagination is a path, not a
 *   duplicate) - except on surfaces that declare `pageIsIndexable: false`.
 * - Any filter: `noindex, follow` and a canonical back to the bare route. The
 *   crawler can see the directive because the URL is never blocked in robots.
 */
export function listMetadata(locale: Locale, input: ListMetadataInput): ListMetadata {
  const { path, raw, filterKeys = FEED_FILTER_KEYS, pageIsIndexable = true } = input;
  const filtered = hasAny(raw, filterKeys);
  const page = Number(single(raw.page));
  const pageIsReal = Number.isInteger(page) && page > 1;
  const indexable = !filtered && (pageIsReal ? pageIsIndexable : true);
  const base = canonicalUrl(locale, path);

  if (!indexable) {
    return { alternates: { canonical: base }, robots: { index: false, follow: true } };
  }

  if (pageIsReal) {
    return {
      alternates: {
        canonical: `${base}?page=${page}`,
        languages: languageAlternates(path, `page=${page}`)
      }
    };
  }

  return { alternates: { canonical: base, languages: languageAlternates(path) } };
}

/** The category keys that are user-facing desks (not `news`). */
export const DESK_KEYS = CATEGORY_RULES.filter((rule) => rule.key !== "news").map((rule) => rule.key);

export function isDesk(key: string): boolean {
  return DESK_KEYS.includes(key);
}

/** "1 402" / "1.402" - descriptions carry an exact number, not a compacted one. */
export function descriptionCount(value: number | null | undefined, locale: Locale): string {
  return formatCount(value ?? 0, locale);
}
