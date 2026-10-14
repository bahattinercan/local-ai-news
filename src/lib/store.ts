import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORY_RULES } from "./classify/rules.ts";
import type { ClassifiedModel } from "./model.ts";

export interface SnapshotNews {
  externalId: string;
  kind: "paper" | "release" | "announcement";
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
  kind?: "paper" | "release" | "announcement";
  limit: number;
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
  } catch {
    return null;
  }
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.snapshot;

  const remoteUrl = await resolveSnapshotUrl();
  if (remoteUrl) {
    try {
      const response = await fetch(remoteUrl, { cache: "no-store" });
      if (response.ok) {
        const parsed = (await response.json()) as Snapshot;
        if (isUsable(parsed)) {
          cache = { snapshot: parsed, fetchedAt: Date.now() };
          return parsed;
        }
      }
    } catch {
      /* remote unavailable: fall back to the bundled snapshot */
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

export async function getFeed(query: FeedQuery): Promise<ClassifiedModel[]> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return [];

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
  rows = rows.filter((model) => withinWindow(model.firstSeenAt, query.windowDays));

  const order: Record<FeedQuery["sort"], (_left: ClassifiedModel, _right: ClassifiedModel) => number> = {
    new: (a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
    trending: (a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0),
    downloads: (a, b) => (b.downloads ?? 0) - (a.downloads ?? 0),
    likes: (a, b) => (b.likes ?? 0) - (a.likes ?? 0)
  };

  return [...rows].sort(order[query.sort]).slice((query.page - 1) * query.limit, query.page * query.limit);
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

  return [...rows]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, query.limit);
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
