/**
 * Offline SEO audit — docs/en/SEO-PLAN.md §10.2, P1 row "seo-audit.ts + CI".
 *
 * §10.2 describes the contract against a running server: crawl every sitemap
 * URL, read its `<title>`, its canonical, its hreflang links and its `noindex`
 * directive. That gate cannot live in CI as written: it needs a build, a bound
 * port and a network round trip per URL, and a flaky server turns a real
 * regression into a retry. So this script asserts the *same* contract at the
 * layer that produces the HTML:
 *
 *  - the route modules' own `generateMetadata()` (imported and called offline —
 *    no JSX is rendered), so the titles and descriptions checked here are the
 *    ones the pages emit, not a copy maintained in this file;
 *  - `src/app/sitemap.ts` and `src/app/robots.ts` themselves, not a replica;
 *  - the snapshot in `data/feed.json` through `src/lib/store.ts`.
 *
 * Offline equivalents, stated so nobody mistakes this for a crawl:
 *
 *  - "URL returns 200" → the path resolves to a real route and (for entity
 *    pages) to an entity in the snapshot; the sitemap builder only emits such
 *    paths, and the audit re-resolves every one of them.
 *  - "URL is not `noindex`" → `isIndexableModel` / `isIndexableNews`, which is
 *    exactly the predicate the detail routes pass to `robots`.
 *  - "JSON-LD parses" and "reachable in ≤ 3 clicks" are content/structure
 *    checks, not metadata; they stay in the P2 content rubric.
 *
 * Determinism: no network, no server, no clock-dependent assertion. Two pages
 * print snapshot counts (they read `Date.now()` through the store's window
 * filter), so the *text* moves with the calendar; every assertion here is on
 * non-emptiness, uniqueness, canonical/alternate agreement and sitemap
 * membership, none of which depend on the date.
 */

import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { GLOSSARY } from "../src/lib/glossary.ts";
import {
  DESK_KEYS,
  SITE_URL,
  isIndexableModel,
  isIndexableNews,
  languageAlternates,
  modelPath,
  newsPath
} from "../src/lib/seo.ts";
import { loadSnapshot, type Snapshot, type SnapshotNews } from "../src/lib/store.ts";
import type { ClassifiedModel } from "../src/lib/model.ts";
import type { Locale } from "../src/i18n/index.ts";

/* ------------------------------------------------------------------ types -- */

export const LOCALES: readonly Locale[] = ["en", "tr"];

/**
 * One line per check. The ids are stable because the unit test asserts *which*
 * check fires when an input is mutated; renaming one silently disarms a test.
 */
export const CHECK_IDS = ["meta", "titles", "canonical", "alternates", "sitemap", "robots", "index-policy"] as const;
export type CheckId = (typeof CHECK_IDS)[number];

/** A route type, one representative URL, and the metadata that URL emits. */
export interface PageMeta {
  /** `front`, `models`, `category`, `model`, `news-detail`, `glossary-term`, … */
  routeType: string;
  /** Locale-relative and query-free, e.g. `/c/llm`. */
  path: string;
  locale: Locale;
  title: string;
  description: string;
  canonical: string;
  /** What the page advertises as `alternates.languages`, if anything. */
  languages: Record<string, string>;
  /** False when the page renders `noindex, follow`. */
  indexable: boolean;
}

export interface SitemapEntry {
  url: string;
  alternates?: { languages?: Record<string, string> };
  [key: string]: unknown;
}

export interface RobotsRule {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
}

export interface RobotsPolicy {
  rules?: RobotsRule | RobotsRule[];
  sitemap?: string | string[];
}

export interface AuditInput {
  siteUrl: string;
  pages: PageMeta[];
  sitemap: SitemapEntry[];
  robots: RobotsPolicy;
  snapshot: Snapshot | null;
}

export interface CheckResult {
  id: CheckId;
  ok: boolean;
  /** Human summary of what was covered, printed after the id. */
  detail: string;
  failures: string[];
}

export interface AuditResult {
  ok: boolean;
  checks: CheckResult[];
  failures: string[];
}

/* --------------------------------------------------------------- helpers -- */

function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function robotsRules(policy: RobotsPolicy): RobotsRule[] {
  const rules = policy.rules;
  if (!rules) return [];
  return Array.isArray(rules) ? rules : [rules];
}

function bySlug(a: ClassifiedModel, b: ClassifiedModel): number {
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
}

function byExternalId(a: SnapshotNews, b: SnapshotNews): number {
  return a.externalId < b.externalId ? -1 : a.externalId > b.externalId ? 1 : 0;
}

/** `/en/m/owner-repo` → `{ locale: "en", path: "/m/owner-repo" }`. */
export function splitSiteUrl(siteUrl: string, url: string): { locale: Locale; path: string } | null {
  const prefix = `${siteUrl.replace(/\/+$/, "")}/`;
  if (!url.startsWith(prefix)) return null;
  const [locale, ...tail] = url.slice(prefix.length).split("/");
  if (locale !== "en" && locale !== "tr") return null;
  return { locale, path: tail.length > 0 ? `/${tail.join("/")}` : "/" };
}

/* ---------------------------------------------------------------- checks -- */

/** (a) Every indexable route type yields a non-empty title and description. */
function checkMeta(input: AuditInput): CheckResult {
  const failures: string[] = [];
  const indexable = input.pages.filter((page) => page.indexable);
  for (const page of indexable) {
    if (page.title.trim() === "") failures.push(`${page.locale} ${page.path} (${page.routeType}): empty title`);
    if (page.description.trim() === "") failures.push(`${page.locale} ${page.path} (${page.routeType}): empty description`);
  }
  const routeTypes = [...new Set(input.pages.map((page) => page.routeType))].sort();
  return {
    id: "meta",
    ok: failures.length === 0,
    detail: `${indexable.length} indexable pages across ${routeTypes.length} route types × ${LOCALES.join("/")}`,
    failures
  };
}

/** (b) Titles are unique across route types, per locale. */
function checkTitles(input: AuditInput): CheckResult {
  const failures: string[] = [];
  let checked = 0;
  for (const locale of LOCALES) {
    const seen = new Map<string, string>();
    for (const page of input.pages.filter((candidate) => candidate.locale === locale && candidate.indexable)) {
      const title = page.title.trim();
      if (title === "") continue;
      checked += 1;
      const previous = seen.get(title);
      if (previous) failures.push(`${locale}: "${title}" is emitted by both ${previous} and ${page.path}`);
      else seen.set(title, page.path);
    }
  }
  return {
    id: "titles",
    ok: failures.length === 0,
    detail: `${checked} titles compared per locale`,
    failures
  };
}

/**
 * Next resolves a relative `alternates.canonical` against the layout's
 * `metadataBase`, so `/en/compare` is emitted as an absolute URL. The audit
 * reads the builder output, not the rendered tag, so it applies the same
 * resolution here instead of demanding absolute input from every page.
 */
function absolute(input: AuditInput, url: string): string {
  if (url.startsWith("/")) return `${input.siteUrl}${url}`;
  return url;
}

/** (c) Canonical is self-referential and equals languageAlternates(path)[locale]. */
function checkCanonical(input: AuditInput): CheckResult {
  const failures: string[] = [];
  let checked = 0;
  for (const page of input.pages.filter((candidate) => candidate.indexable)) {
    checked += 1;
    const expected = languageAlternates(page.path)[page.locale];
    if (absolute(input, page.canonical) !== expected) {
      failures.push(`${page.locale} ${page.path}: canonical is ${JSON.stringify(page.canonical)}, expected ${expected}`);
      continue;
    }
    const self = splitSiteUrl(input.siteUrl, absolute(input, page.canonical));
    if (!self || self.locale !== page.locale || self.path !== page.path) {
      failures.push(`${page.locale} ${page.path}: canonical ${page.canonical} does not point at the page itself`);
    }
  }
  return {
    id: "canonical",
    ok: failures.length === 0,
    detail: `${checked} self-canonical pages and ${checked} languageAlternates() pairs`,
    failures
  };
}

/**
 * (d) `en` / `tr` / `x-default` are reciprocal for every advertised path: the
 * triplet a page claims must itself be advertised, and every advertised page
 * must claim the same triplet. A sitemap that lists only `/en/m/x` fails here.
 */
function checkAlternates(input: AuditInput): CheckResult {
  const failures: string[] = [];
  const advertised = new Map(input.sitemap.map((entry) => [entry.url, entry]));
  const paths = new Set<string>();
  for (const entry of input.sitemap) {
    const split = splitSiteUrl(input.siteUrl, entry.url);
    if (!split) {
      failures.push(`${entry.url}: not a ${input.siteUrl}/<locale>/… URL`);
      continue;
    }
    paths.add(split.path);
  }
  for (const path of [...paths].sort()) {
    const triplet = languageAlternates(path);
    for (const key of ["en", "tr", "x-default"] as const) {
      if (!advertised.has(triplet[key])) {
        failures.push(`${path}: ${key} alternate ${triplet[key]} is not advertised in the sitemap`);
      }
    }
    for (const locale of LOCALES) {
      const entry = advertised.get(triplet[locale]);
      const languages = entry?.alternates?.languages;
      if (!entry || !languages) continue;
      for (const key of ["en", "tr", "x-default"] as const) {
        if (languages[key] !== triplet[key]) {
          failures.push(
            `${triplet[locale]}: advertises ${key} as ${JSON.stringify(languages[key])}, expected ${triplet[key]}`
          );
        }
      }
    }
  }
  return {
    id: "alternates",
    ok: failures.length === 0,
    detail: `${paths.size} advertised paths × en/tr/x-default reciprocity`,
    failures
  };
}

/** Resolves a sitemap URL to the entity its page renders, or to a failure. */
function resolveAdvertisedPath(
  input: AuditInput,
  path: string,
  models: Map<string, ClassifiedModel>,
  news: Map<string, SnapshotNews>
): string | null {
  if (path === "/") return null;
  const [head, ...rest] = path.split("/").filter(Boolean);
  const tail = rest.join("/");

  if (head === "m") {
    const model = models.get(tail);
    if (!model) return `404s: no model with slug ${JSON.stringify(tail)} in the snapshot`;
    if (!isIndexableModel(model)) return `renders noindex: ${model.externalId} fails isIndexableModel`;
    return null;
  }
  if (head === "n") {
    /* `newsPath()` percent-encodes the external id; the snapshot stores it raw. */
    let decoded = tail;
    try {
      decoded = decodeURIComponent(tail);
    } catch {
      return `404s: ${JSON.stringify(tail)} is not a decodable news id`;
    }
    const item = news.get(decoded);
    if (!item) return `404s: no news item with id ${JSON.stringify(decoded)} in the snapshot`;
    if (!isIndexableNews(item)) return `renders noindex: ${item.externalId} fails isIndexableNews`;
    return null;
  }
  if (head === "glossary") {
    if (tail === "") return null;
    return GLOSSARY.some((entry) => entry.slug === tail) ? null : `404s: no glossary term ${JSON.stringify(tail)}`;
  }
  if (head === "c") {
    return DESK_KEYS.includes(tail) ? null : `404s: ${JSON.stringify(tail)} is not a desk route`;
  }
  if (head === "models" || head === "news" || head === "research" || head === "stats" || head === "compare") {
    return tail === "" ? null : `404s: unknown route ${path}`;
  }
  return `404s: unknown route ${path}`;
}

/** (e) No query strings, no duplicates, no `noindex`/404 page advertised. */
function checkSitemap(input: AuditInput): CheckResult {
  const failures: string[] = [];
  const models = new Map((input.snapshot?.models ?? []).map((model) => [model.slug, model]));
  const news = new Map((input.snapshot?.news ?? []).map((item) => [item.externalId, item]));
  const seen = new Set<string>();

  for (const entry of input.sitemap) {
    if (entry.url.includes("?")) failures.push(`${entry.url}: contains a query string`);
    if (seen.has(entry.url)) failures.push(`${entry.url}: listed more than once`);
    seen.add(entry.url);

    const split = splitSiteUrl(input.siteUrl, entry.url);
    if (!split) {
      failures.push(`${entry.url}: is not a ${input.siteUrl}/<locale>/… URL`);
      continue;
    }
    const problem = resolveAdvertisedPath(input, split.path, models, news);
    if (problem) failures.push(`${entry.url}: ${problem}`);
  }

  return {
    id: "sitemap",
    ok: failures.length === 0,
    detail: `${seen.size} URLs, ${models.size} models and ${news.size} news items resolved`,
    failures
  };
}

/** (f) robots disallows /api/ and advertises the sitemap. */
function checkRobots(input: AuditInput): CheckResult {
  const failures: string[] = [];
  const rules = robotsRules(input.robots);
  const wildcard = rules.filter((rule) => asList(rule.userAgent).includes("*"));
  const scoped = wildcard.length > 0 ? wildcard : rules;

  if (scoped.length === 0) failures.push("robots.txt declares no rules");
  for (const rule of scoped) {
    const disallow = asList(rule.disallow);
    if (!disallow.includes("/api/")) {
      failures.push(`robots rule for ${asList(rule.userAgent).join(",") || "(none)"}: does not disallow /api/`);
    }
    if (disallow.includes("/")) {
      failures.push(`robots rule for ${asList(rule.userAgent).join(",") || "(none)"}: disallows the whole site`);
    }
  }

  const sitemaps = asList(input.robots.sitemap);
  const expected = `${input.siteUrl}/sitemap.xml`;
  if (!sitemaps.includes(expected)) {
    failures.push(`robots.txt advertises ${JSON.stringify(sitemaps)}, expected ${expected}`);
  }

  return {
    id: "robots",
    ok: failures.length === 0,
    detail: `${rules.length} rules, sitemap ${sitemaps.join(", ") || "(none)"}`,
    failures
  };
}

/** (g) The index policy and the sitemap agree, in both directions. */
function checkIndexPolicy(input: AuditInput): CheckResult {
  const failures: string[] = [];
  const advertised = new Set(input.sitemap.map((entry) => entry.url));
  const models = [...(input.snapshot?.models ?? [])].sort(bySlug);
  const news = [...(input.snapshot?.news ?? [])].sort(byExternalId);
  const notes: string[] = [];

  const samples: Array<{ label: string; path: string; shouldIndex: boolean }> = [];
  const passingModel = models.find((model) => isIndexableModel(model));
  const failingModel = models.find((model) => !isIndexableModel(model));
  if (passingModel) samples.push({ label: "passing model", path: modelPath(passingModel), shouldIndex: true });
  else notes.push("no passing model in this snapshot");
  if (failingModel) samples.push({ label: "failing model", path: modelPath(failingModel), shouldIndex: false });
  else notes.push("no failing model in this snapshot");

  const passingNews = news.find((item) => isIndexableNews(item));
  const failingNews = news.find((item) => !isIndexableNews(item));
  if (passingNews) samples.push({ label: "passing news", path: newsPath(passingNews), shouldIndex: true });
  else notes.push("no passing news item in this snapshot");
  if (failingNews) samples.push({ label: "failing news", path: newsPath(failingNews), shouldIndex: false });
  else notes.push("no failing news item in this snapshot");

  for (const sample of samples) {
    for (const locale of LOCALES) {
      const url = languageAlternates(sample.path)[locale];
      const present = advertised.has(url);
      if (sample.shouldIndex && !present) {
        failures.push(`${url}: ${sample.label} ${sample.path} passes the index predicate but is absent from the sitemap`);
      }
      if (!sample.shouldIndex && present) {
        failures.push(`${url}: ${sample.label} ${sample.path} fails the index predicate but is in the sitemap`);
      }
    }
  }

  /* Counts, not just samples: one mismatched row anywhere in the snapshot is
     the same bug the samples look for, and the count catches it. */
  const indexableModels = models.filter((model) => isIndexableModel(model)).length;
  const indexableNews = news.filter((item) => isIndexableNews(item)).length;
  for (const locale of LOCALES) {
    const urls = input.sitemap.map((entry) => splitSiteUrl(input.siteUrl, entry.url));
    const modelUrls = urls.filter((split) => split?.locale === locale && split.path.startsWith("/m/")).length;
    const newsUrls = urls.filter((split) => split?.locale === locale && split.path.startsWith("/n/")).length;
    if (modelUrls !== indexableModels) {
      failures.push(`${locale}: sitemap carries ${modelUrls} model URLs but ${indexableModels} models pass isIndexableModel`);
    }
    if (newsUrls !== indexableNews) {
      failures.push(`${locale}: sitemap carries ${newsUrls} news URLs but ${indexableNews} items pass isIndexableNews`);
    }
  }

  return {
    id: "index-policy",
    ok: failures.length === 0,
    detail: `${samples.length} samples, ${indexableModels} indexable models, ${indexableNews} indexable news${notes.length ? ` (${notes.join("; ")})` : ""}`,
    failures
  };
}

/* ----------------------------------------------------------------- audit -- */

export function runAudit(input: AuditInput): AuditResult {
  const checks = [
    checkMeta(input),
    checkTitles(input),
    checkCanonical(input),
    checkAlternates(input),
    checkSitemap(input),
    checkRobots(input),
    checkIndexPolicy(input)
  ];
  return {
    ok: checks.every((check) => check.ok),
    checks,
    failures: checks.flatMap((check) => check.failures.map((failure) => `${check.id}: ${failure}`))
  };
}

/* ------------------------------------------------------------ real input -- */

/** The `Metadata` shape this script reads; anything else on it is irrelevant. */
interface RawMetadata {
  title?: unknown;
  description?: unknown;
  alternates?: { canonical?: unknown; languages?: Record<string, string> | null } | null;
  robots?: unknown;
}

function metadataTitle(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as { absolute?: unknown; default?: unknown };
    if (typeof record.absolute === "string") return record.absolute;
    if (typeof record.default === "string") return record.default;
  }
  return "";
}

function metadataDescription(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function metadataCanonical(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof URL) return value.toString();
  return "";
}

function metadataLanguages(value: Record<string, string> | null | undefined): Record<string, string> {
  return value ?? {};
}

function metadataIsNoindex(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const robots = value as { index?: unknown };
  return robots.index === false;
}

/** `generateMetadata()` props are promises in Next 16; the props are stubbed. */
function props(params: Record<string, string>): never {
  return { params: Promise.resolve(params), searchParams: Promise.resolve({}) } as never;
}

function page(routeType: string, path: string, locale: Locale, raw: RawMetadata): PageMeta {
  return {
    routeType,
    path,
    locale,
    title: metadataTitle(raw.title),
    description: metadataDescription(raw.description),
    canonical: metadataCanonical(raw.alternates?.canonical),
    languages: metadataLanguages(raw.alternates?.languages),
    indexable: !metadataIsNoindex(raw.robots)
  };
}

/**
 * Build the audit input from the real modules.
 *
 * The store is forced offline before the first read: with `SNAPSHOT_URL` or a
 * Blob token in the environment `loadSnapshot()` would fetch the deployed
 * snapshot, and the gate would then depend on the network and on whatever was
 * published last — exactly what this script must not do.
 */
export async function loadAuditInput(): Promise<AuditInput> {
  delete process.env.SNAPSHOT_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;

  const snapshot = await loadSnapshot();

  const { default: sitemap } = await import("../src/app/sitemap.ts");
  const { default: robots } = await import("../src/app/robots.ts");

  const models = [...(snapshot?.models ?? [])].sort(bySlug);
  const news = [...(snapshot?.news ?? [])].sort(byExternalId);
  const sampleModel = models.find((model) => isIndexableModel(model));
  const sampleNews = news.find((item) => isIndexableNews(item));
  const sampleTerm = [...GLOSSARY].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))[0];

  const front = await import("../src/app/[locale]/page.tsx");
  const modelsPage = await import("../src/app/[locale]/models/page.tsx");
  const categoryPage = await import("../src/app/[locale]/c/[category]/page.tsx");
  const modelPage = await import("../src/app/[locale]/m/[slug]/page.tsx");
  const newsDetail = await import("../src/app/[locale]/n/[id]/page.tsx");
  const newsPage = await import("../src/app/[locale]/news/page.tsx");
  const researchPage = await import("../src/app/[locale]/research/page.tsx");
  const glossaryPage = await import("../src/app/[locale]/glossary/page.tsx");
  const glossaryTerm = await import("../src/app/[locale]/glossary/[slug]/page.tsx");
  const statsPage = await import("../src/app/[locale]/stats/page.tsx");
  const comparePage = await import("../src/app/[locale]/compare/page.tsx");

  const pages: PageMeta[] = [];
  for (const locale of LOCALES) {
    pages.push(page("front", "/", locale, (await front.generateMetadata(props({ locale }))) as RawMetadata));
    pages.push(page("models", "/models", locale, (await modelsPage.generateMetadata(props({ locale }))) as RawMetadata));
    for (const desk of DESK_KEYS) {
      pages.push(
        page(
          "category",
          `/c/${desk}`,
          locale,
          (await categoryPage.generateMetadata(props({ locale, category: desk }))) as RawMetadata
        )
      );
    }
    if (sampleModel) {
      pages.push(
        page(
          "model",
          modelPath(sampleModel),
          locale,
          (await modelPage.generateMetadata(props({ locale, slug: sampleModel.slug }))) as RawMetadata
        )
      );
    }
    if (sampleNews) {
      pages.push(
        page(
          "news-detail",
          newsPath(sampleNews),
          locale,
          (await newsDetail.generateMetadata(props({ locale, id: sampleNews.externalId }))) as RawMetadata
        )
      );
    }
    pages.push(page("news", "/news", locale, (await newsPage.generateMetadata(props({ locale }))) as RawMetadata));
    pages.push(
      page("research", "/research", locale, (await researchPage.generateMetadata(props({ locale }))) as RawMetadata)
    );
    pages.push(
      page("glossary", "/glossary", locale, (await glossaryPage.generateMetadata(props({ locale }))) as RawMetadata)
    );
    if (sampleTerm) {
      pages.push(
        page(
          "glossary-term",
          `/glossary/${sampleTerm.slug}`,
          locale,
          (await glossaryTerm.generateMetadata(props({ locale, slug: sampleTerm.slug }))) as RawMetadata
        )
      );
    }
    pages.push(page("stats", "/stats", locale, (await statsPage.generateMetadata(props({ locale }))) as RawMetadata));
    pages.push(
      page("compare", "/compare", locale, (await comparePage.generateMetadata(props({ locale }))) as RawMetadata)
    );
  }

  return {
    siteUrl: SITE_URL,
    pages,
    sitemap: (await sitemap()) as SitemapEntry[],
    robots: robots() as RobotsPolicy,
    snapshot
  };
}

/* ------------------------------------------------------------------- cli -- */

async function main(): Promise<void> {
  const input = await loadAuditInput();
  const result = runAudit(input);

  for (const check of result.checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.id.padEnd(13)} ${check.detail}`);
    for (const failure of check.failures) console.log(`        - ${failure}`);
  }

  const failed = result.checks.filter((check) => !check.ok).length;
  console.log(
    failed === 0
      ? `seo-audit: ${result.checks.length}/${result.checks.length} checks passed (${input.sitemap.length} sitemap URLs, ${input.pages.length} pages)`
      : `seo-audit: ${failed}/${result.checks.length} checks failed (${result.failures.length} findings)`
  );

  if (!result.ok) process.exitCode = 1;
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entry === import.meta.url && !process.env.NODE_TEST_CONTEXT) {
  await main();
}
