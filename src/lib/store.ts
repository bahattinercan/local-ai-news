import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORY_RULES } from "./classify/rules.ts";
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
  return snapshot.news.map((item) => ({
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

export async function getPulse(days: number): Promise<Pulse | null> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return null;

  const rows = filterModels(snapshot, {
    windowDays: days,
    sort: "new",
    gate: "passed",
    excludeGated: true,
    limit: 100,
    page: 1
  });

  const counts = new Map<string, number>();
  for (const model of rows) counts.set(model.primaryCategory, (counts.get(model.primaryCategory) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const hot = [...rows]
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, 5);

  return {
    tracked: filterModels(snapshot, { windowDays: days, sort: "new", gate: "all", excludeGated: true, limit: 1, page: 1 }).length,
    passed: rows.length,
    topCategory: top?.[0] ?? null,
    topCategoryCount: top?.[1] ?? 0,
    generatedAt: snapshot.generatedAt,
    hot
  };
}

export async function getDailySeries(days: number): Promise<Array<{ date: string; count: number }>> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return [];

  const buckets = new Map<string, number>();
  for (const model of snapshot.models) {
    if (!withinWindow(model.firstSeenAt, days)) continue;
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

export async function getNews(query: NewsQuery): Promise<SnapshotNews[]> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return [];

  let rows = normalizeNews(snapshot);
  if (query.category) rows = rows.filter((item) => item.categoryKey === query.category);
  if (query.kind) rows = rows.filter((item) => item.kind === query.kind);
  rows = rows.filter((item) => withinWindow(item.publishedAt, query.windowDays));

  const sorted = [...rows].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const page = query.page ?? 1;
  return sorted.slice((page - 1) * query.limit, page * query.limit);
}

export async function countNews(query: NewsQuery): Promise<number> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return 0;
  let rows = normalizeNews(snapshot);
  if (query.category) rows = rows.filter((item) => item.categoryKey === query.category);
  if (query.kind) rows = rows.filter((item) => item.kind === query.kind);
  return rows.filter((item) => withinWindow(item.publishedAt, query.windowDays)).length;
}

export async function getStats(days: number): Promise<Array<{ category: string; count: number }>> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return [];

  const counts = new Map<string, number>();
  for (const model of snapshot.models) {
    if (!withinWindow(model.firstSeenAt, days)) continue;
    counts.set(model.primaryCategory, (counts.get(model.primaryCategory) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

export async function getCategories(): Promise<Array<{ key: string; labelEn: string; labelTr: string; sortOrder: number }>> {
  const snapshot = await loadSnapshot();
  const present = new Set(snapshot?.models.map((model) => model.primaryCategory) ?? []);
  return CATEGORY_RULES
    .filter((rule) => rule.key !== "news" && present.has(rule.key))
    .map((rule) => ({ key: rule.key, labelEn: rule.labelEn, labelTr: rule.labelTr, sortOrder: rule.sortOrder }));
}
