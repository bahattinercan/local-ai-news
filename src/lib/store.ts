import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORY_RULES } from "./classify/rules.ts";
import { NEWS_SCOPE_KINDS, FEED_DEFAULTS, normalizeFeedQuery, type FeedFilterInput } from "./query.ts";
import type { ClassifiedModel } from "./model.ts";

export interface SnapshotNews {
  externalId: string;
  kind: "paper" | "release" | "announcement" | "runtime" | "community";
  title: string;
  summary?: string;
  thumbnail?: string;
  url: string;
  publishedAt: string;
  organization?: string | null;
  upvotes?: number | null;
  modelSlug?: string | null;
  categoryKey?: string | null;
}

export interface Snapshot {
  generatedAt: string;
  models: ClassifiedModel[];
  news: SnapshotNews[];
}

export interface FeedQuery {
  category?: string;
  windowDays: number;
  sort: "new" | "trending" | "downloads" | "likes";
  gate: "passed" | "all";
  runner?: string;
  maxParams?: number;
  license?: string;
  excludeGated: boolean;
  q?: string;
  limit: number;
  page: number;
}

export interface NewsQuery {
  windowDays: number;
  /** Which surface asked; defaults to the news scope so papers stay out of /news. */
  scope?: "news" | "research" | "all";
  category?: string;
  kind?: "paper" | "release" | "announcement" | "runtime" | "community";
  limit: number;
  page?: number;
}

/**
 * Data lives in one JSON snapshot (decision 2 reversed: no Postgres).
 * SNAPSHOT_URL points at the Vercel Blob object published by the ingest job;
 * data/feed.json in the repo is the bundled fallback so the site is never empty.
 */
const CACHE_TTL_MS = 900_000;

let cache: { snapshot: Snapshot; fetchedAt: number } | null = null;

export function snapshotPath(): string {
  return join(process.cwd(), "data", "feed.json");
}

function readLocalSnapshot(): Snapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as Snapshot;
    return Array.isArray(parsed.models) ? parsed : null;
  } catch {
    return null;
  }
}

function isUsable(snapshot: Snapshot | null): boolean {
  return Boolean(snapshot && Array.isArray(snapshot.models) && snapshot.models.length > 0);
}

let blobUrl: string | null = null;

async function resolveSnapshotUrl(): Promise<string | null> {
  if (process.env.SNAPSHOT_URL) return process.env.SNAPSHOT_URL;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  if (blobUrl) return blobUrl;
  try {
    const { list } = await import("@vercel/blob");
    const result = await list({ limit: 1, token });
    blobUrl = result.blobs[0]?.url ?? null;
    return blobUrl;
  } catch (error) {
    console.warn("blob list failed:", (error as Error).message);
    return null;
  }
}

async function fetchSnapshot(url: string): Promise<Snapshot | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const { get } = await import("@vercel/blob");
      const result = await get(url, { token, access: "private" });
      if (result && result.statusCode === 200) {
        const parsed = JSON.parse(await new Response(result.stream).text()) as Snapshot;
        if (isUsable(parsed)) return parsed;
      }
    } catch (error) {
      console.warn("blob read failed:", (error as Error).message);
    }
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const parsed = (await response.json()) as Snapshot;
    return isUsable(parsed) ? parsed : null;
  } catch (error) {
    console.warn("snapshot fetch failed:", (error as Error).message);
    return null;
  }
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.snapshot;

  const remoteUrl = await resolveSnapshotUrl();
  if (remoteUrl) {
    const parsed = await fetchSnapshot(remoteUrl);
    if (parsed) {
      cache = { snapshot: parsed, fetchedAt: Date.now() };
      return parsed;
    }
  }

  const local = readLocalSnapshot();
  if (local) cache = { snapshot: local, fetchedAt: Date.now() };
  return local;
}

export async function getGeneratedAt(): Promise<string | null> {
  const snapshot = await loadSnapshot();
  return snapshot?.generatedAt ?? null;
}

function withinWindow(iso: string, days: number): boolean {
  const then = new Date(iso).getTime();
  return Date.now() - then <= days * 86_400_000;
}

function normalizeNews(snapshot: Snapshot): SnapshotNews[] {
  /* A snapshot written without the `news` key must degrade to "no news" instead
     of throwing out of every news surface (`isUsable` only guards `models`). */
  return (snapshot.news ?? []).map((item) => ({
    ...item,
    organization: typeof item.organization === "string" ? item.organization : null
  }));
}

/**
 * HF `trendingScore` is null for every model in the snapshot (measured: 0/915),
 * so the `trending` sort would be a no-op. Derive a score at read time instead
 * of persisting a new field.
 */
export function derivedTrending(model: ClassifiedModel): number {
  return model.trendingScore ?? model.likes * 3 + model.downloads / 10;
}

function filterModels(snapshot: Snapshot, query: FeedQuery): ClassifiedModel[] {
  let rows = snapshot.models;
  if (query.category) rows = rows.filter((model) => model.primaryCategory === query.category);
  if (query.gate === "passed") rows = rows.filter((model) => model.qualityPassed);
  if (query.excludeGated) rows = rows.filter((model) => !model.gated);
  if (query.runner) rows = rows.filter((model) => model.runners.includes(query.runner!));
  if (query.maxParams) rows = rows.filter((model) => model.paramsTotal && model.paramsTotal <= query.maxParams! * 1e9);
  if (query.license) rows = rows.filter((model) => model.license === query.license);
  if (query.q) {
    const needle = query.q.toLowerCase();
    rows = rows.filter((model) => model.externalId.toLowerCase().includes(needle));
  }
  return rows.filter((model) => withinWindow(model.firstSeenAt, query.windowDays));
}

export async function getFeed(query: FeedQuery): Promise<ClassifiedModel[]> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return [];

  const rows = filterModels(snapshot, query);

  const order: Record<FeedQuery["sort"], (_left: ClassifiedModel, _right: ClassifiedModel) => number> = {
    new: (a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
    trending: (a, b) => derivedTrending(b) - derivedTrending(a),
    downloads: (a, b) => (b.downloads ?? 0) - (a.downloads ?? 0),
    likes: (a, b) => (b.likes ?? 0) - (a.likes ?? 0)
  };

  return [...rows].sort(order[query.sort]).slice((query.page - 1) * query.limit, query.page * query.limit);
}

export async function countFeed(query: FeedQuery): Promise<number> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return 0;
  return filterModels(snapshot, query).length;
}

export interface Pulse {
  tracked: number;
  passed: number;
  topCategory: string | null;
  topCategoryCount: number;
  generatedAt: string | null;
  hot: ClassifiedModel[];
}

export async function getPulse(days: number, category?: string): Promise<Pulse | null> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return null;

  const scope = { category, windowDays: days, sort: "new" as const, excludeGated: true, limit: 100, page: 1 };

  const rows = filterModels(snapshot, { ...scope, gate: "passed" });

  const counts = new Map<string, number>();
  for (const model of rows) counts.set(model.primaryCategory, (counts.get(model.primaryCategory) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const hot = [...rows]
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, 5);

  return {
    tracked: filterModels(snapshot, { ...scope, gate: "all", limit: 1 }).length,
    passed: rows.length,
    topCategory: top?.[0] ?? null,
    topCategoryCount: top?.[1] ?? 0,
    generatedAt: snapshot.generatedAt,
    hot
  };
}

export async function getDailySeries(days: number, options: StatsOptions = {}): Promise<Array<{ date: string; count: number }>> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return [];

  const buckets = new Map<string, number>();
  for (const model of filterModels(snapshot, statsQuery(days, options))) {
    const date = model.firstSeenAt.slice(0, 10);
    buckets.set(date, (buckets.get(date) ?? 0) + 1);
  }
  return [...buckets.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getModel(slug: string): Promise<ClassifiedModel | null> {
  const snapshot = await loadSnapshot();
  return snapshot?.models.find((model) => model.slug === slug) ?? null;
}

/**
 * Next 16 hands a dynamic segment through **still percent-encoded**: `params.id`
 * arrived as `reddit_localllama%3At3_1x6yk1f` (length 30) for both the raw and
 * the encoded request url. Encoding is not optional on the way in — external ids
 * contain `:` and releases even a literal `/` (`release:ZhengmingYu/DMAD`) — so
 * the lookup accepts both forms. A malformed escape yields just the raw value
 * instead of throwing.
 */
export function newsIdCandidates(rawId: string): string[] {
  try {
    const decoded = decodeURIComponent(rawId);
    return decoded === rawId ? [rawId] : [rawId, decoded];
  } catch {
    return [rawId];
  }
}

export async function getNewsItemByParam(rawId: string): Promise<SnapshotNews | null> {
  for (const candidate of newsIdCandidates(rawId)) {
    const item = await getNewsItem(candidate);
    if (item) return item;
  }
  return null;
}

export async function getNewsItem(externalId: string): Promise<SnapshotNews | null> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return null;
  return snapshot.news.find((item) => item.externalId === externalId) ?? null;
}

/** Shared by getNews and countNews so the two can never disagree. */
function filterNews(snapshot: Snapshot, query: NewsQuery): SnapshotNews[] {
  const scopeKinds = NEWS_SCOPE_KINDS[query.scope ?? "news"];

  let rows = normalizeNews(snapshot);
  if (scopeKinds) rows = rows.filter((item) => scopeKinds.includes(item.kind));
  if (query.kind) rows = rows.filter((item) => item.kind === query.kind);
  if (query.category) rows = rows.filter((item) => item.categoryKey === query.category);
  return rows.filter((item) => withinWindow(item.publishedAt, query.windowDays));
}

export async function getNews(query: NewsQuery): Promise<SnapshotNews[]> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return [];

  const rows = filterNews(snapshot, query);
  const sorted = [...rows].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const page = query.page ?? 1;
  return sorted.slice((page - 1) * query.limit, page * query.limit);
}

export async function countNews(query: NewsQuery): Promise<number> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return 0;
  return filterNews(snapshot, query).length;
}

export async function getStats(
  days: number,
  options: StatsOptions = {}
): Promise<Array<{ category: string; count: number }>> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return [];

  /* Same filter definition as the feed (and the tab badges), so /stats cannot
     print "Audio 244" next to a feed tab that says "Audio 17". Before this it
     counted every tracked row, gate and gated repo included, while the feed
     defaulted to gate-passed. */
  const rows = filterModels(snapshot, statsQuery(days, options));
  const counts = new Map<string, number>();
  for (const model of rows) counts.set(model.primaryCategory, (counts.get(model.primaryCategory) ?? 0) + 1);
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

/** The filter set the stats surfaces share with the feed. */
export interface StatsOptions {
  gate?: "passed" | "all";
  excludeGated?: boolean;
}

function statsQuery(days: number, options: StatsOptions): FeedQuery {
  return {
    windowDays: days,
    sort: "new",
    gate: options.gate ?? FEED_DEFAULTS.gate,
    excludeGated: options.excludeGated ?? true,
    limit: 0,
    page: 1
  };
}

/**
 * Counts for the category strip. A tab is a link into a feed, so its badge has
 * to be the number of cards that link will show: the same window, gate, runner,
 * size, license and search, with the category swapped per tab. Counting every
 * tracked model instead printed "Multimodal 153" for a page with 33 cards.
 *
 * Reuses `filterModels` on purpose — one filter definition, no second opinion —
 * and one snapshot read for the whole strip.
 */
export async function getCategoryCounts(input: FeedFilterInput): Promise<{ total: number; counts: Map<string, number> }> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return { total: 0, counts: new Map() };

  const keys = ["", ...CATEGORY_RULES.filter((rule) => rule.key !== "news").map((rule) => rule.key)];
  const counts = new Map<string, number>();
  let total = 0;

  for (const key of keys) {
    // Decision 9 ("show everything" only inside a category and <=30d) lives in
    // normalizeFeedQuery, so ask it per tab rather than re-deriving the gate.
    const query = normalizeFeedQuery({ ...input, category: key || undefined, limit: 0, page: 1 });
    const count = filterModels(snapshot, {
      category: query.category,
      windowDays: query.windowDays,
      sort: query.sort,
      gate: query.gate,
      runner: query.runner,
      maxParams: query.maxParams,
      license: query.license,
      excludeGated: query.excludeGated,
      q: query.q,
      limit: 0,
      page: 1
    }).length;

    if (key === "") total = count;
    else counts.set(key, count);
  }

  return { total, counts };
}

export async function getCategories(): Promise<Array<{ key: string; labelEn: string; labelTr: string; sortOrder: number }>> {
  const snapshot = await loadSnapshot();
  const present = new Set(snapshot?.models.map((model) => model.primaryCategory) ?? []);
  return CATEGORY_RULES
    .filter((rule) => rule.key !== "news" && present.has(rule.key))
    .map((rule) => ({ key: rule.key, labelEn: rule.labelEn, labelTr: rule.labelTr, sortOrder: rule.sortOrder }));
}
