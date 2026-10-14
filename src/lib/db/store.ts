import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { and, desc, eq, gte, like, sql } from "drizzle-orm";
import { getDb } from "./client.ts";
import { categories as categoriesTable, models, news } from "./schema.ts";
import type { ClassifiedModel } from "../model.ts";

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

export function snapshotPath(): string {
  return join(process.cwd(), "data", "feed.json");
}

export function readSnapshot(): Snapshot | null {
  const path = snapshotPath();
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as Snapshot;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function withinWindow(iso: string, days: number): boolean {
  const then = new Date(iso).getTime();
  return Date.now() - then <= days * 86_400_000;
}

function snapshotFeed(query: FeedQuery): ClassifiedModel[] {
  const snapshot = readSnapshot();
  if (!snapshot) return [];

  let rows = snapshot.models;
  if (query.category) rows = rows.filter((m) => m.primaryCategory === query.category);
  if (query.gate === "passed") rows = rows.filter((m) => m.qualityPassed);
  if (query.excludeGated) rows = rows.filter((m) => !m.gated);
  if (query.runner) rows = rows.filter((m) => m.runners.includes(query.runner!));
  if (query.maxParams) rows = rows.filter((m) => m.paramsTotal && m.paramsTotal <= query.maxParams! * 1e9);
  if (query.license) rows = rows.filter((m) => m.license === query.license);
  if (query.q) {
    const needle = query.q.toLowerCase();
    rows = rows.filter((m) => m.externalId.toLowerCase().includes(needle));
  }
  rows = rows.filter((m) => withinWindow(m.firstSeenAt, query.windowDays));

  const order: Record<FeedQuery["sort"], (_a: ClassifiedModel, _b: ClassifiedModel) => number> = {
    new: (a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime(),
    trending: (a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0),
    downloads: (a, b) => (b.downloads ?? 0) - (a.downloads ?? 0),
    likes: (a, b) => (b.likes ?? 0) - (a.likes ?? 0)
  };

  return [...rows].sort(order[query.sort]).slice((query.page - 1) * query.limit, query.page * query.limit);
}

function mapModelRow(row: typeof models.$inferSelect): ClassifiedModel {
  return {
    externalId: row.externalId,
    slug: row.slug,
    name: row.name,
    author: row.author,
    primaryCategory: row.primaryCategory,
    categories: [],
    pipelineTag: row.pipelineTag,
    libraryName: row.libraryName,
    license: row.license,
    licenseName: row.licenseName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    firstSeenAt: row.firstSeenAt.toISOString(),
    downloads: row.downloads ?? 0,
    likes: row.likes ?? 0,
    trendingScore: row.trendingScore,
    gated: row.gated ?? false,
    qualityPassed: row.qualityPassed,
    gateReason: row.gateReason ?? "failed",
    paramsTotal: row.paramsTotal,
    paramDtypes: (row.paramDtypes as Record<string, number>) ?? null,
    storageBytes: row.storageBytes,
    quantizations: (row.quantizations as string[]) ?? [],
    runners: (row.runners as string[]) ?? [],
    vramEstGb: row.vramEstGb,
    sampleImages: (row.sampleImages as string[]) ?? [],
    spaces: (row.spaces as string[]) ?? [],
    url: row.url
  };
}

export async function getFeed(query: FeedQuery): Promise<ClassifiedModel[]> {
  if (!isDbConfigured()) return snapshotFeed(query);

  const db = getDb();
  const conditions = [gte(models.firstSeenAt, sql`now() - make_interval(days => ${query.windowDays})`)];
  if (query.category) conditions.push(eq(models.primaryCategory, query.category));
  if (query.gate === "passed") conditions.push(eq(models.qualityPassed, true));
  if (query.excludeGated) conditions.push(eq(models.gated, false));
  if (query.license) conditions.push(eq(models.license, query.license));
  if (query.maxParams) conditions.push(sql`${models.paramsTotal} <= ${query.maxParams} * 1000000000`);
  if (query.q) conditions.push(like(models.externalId, `%${query.q}%`));

  const orderColumn =
    query.sort === "new" ? models.firstSeenAt
    : query.sort === "trending" ? models.trendingScore
    : query.sort === "downloads" ? models.downloads
    : models.likes;

  const rows = await db
    .select()
    .from(models)
    .where(and(...conditions))
    .orderBy(desc(orderColumn))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);

  return rows.map(mapModelRow);
}

export async function getModel(slug: string): Promise<ClassifiedModel | null> {
  if (!isDbConfigured()) {
    const snapshot = readSnapshot();
    return snapshot?.models.find((m) => m.slug === slug) ?? null;
  }

  const db = getDb();
  const rows = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  return rows[0] ? mapModelRow(rows[0]) : null;
}

export async function getNews(query: NewsQuery): Promise<SnapshotNews[]> {
  if (!isDbConfigured()) {
    const snapshot = readSnapshot();
    if (!snapshot) return [];
    let rows = snapshot.news.map((item) => ({
      ...item,
      organization: typeof item.organization === "string" ? item.organization : null
    }));
    if (query.category) rows = rows.filter((n) => n.categoryKey === query.category);
    if (query.kind) rows = rows.filter((n) => n.kind === query.kind);
    rows = rows.filter((n) => withinWindow(n.publishedAt, query.windowDays));
    return [...rows]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, query.limit);
  }

  const db = getDb();
  const conditions = [gte(news.publishedAt, sql`now() - make_interval(days => ${query.windowDays})`)];
  if (query.category) conditions.push(eq(news.categoryKey, query.category));
  if (query.kind) conditions.push(eq(news.kind, query.kind));

  const rows = await db.select().from(news).where(and(...conditions)).orderBy(desc(news.publishedAt)).limit(query.limit);

  return rows.map((row) => ({
    externalId: row.externalId,
    kind: row.kind as SnapshotNews["kind"],
    title: row.title,
    summary: row.summary ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    url: row.url,
    publishedAt: row.publishedAt.toISOString(),
    organization: row.organization,
    upvotes: row.upvotes,
    modelSlug: null,
    categoryKey: row.categoryKey
  }));
}

export async function getStats(days: number): Promise<Array<{ category: string; count: number }>> {
  if (!isDbConfigured()) {
    const snapshot = readSnapshot();
    if (!snapshot) return [];
    const counts = new Map<string, number>();
    for (const m of snapshot.models) {
      if (!withinWindow(m.firstSeenAt, days)) continue;
      counts.set(m.primaryCategory, (counts.get(m.primaryCategory) ?? 0) + 1);
    }
    return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  }

  const db = getDb();
  const rows = await db
    .select({ category: models.primaryCategory, count: sql<number>`count(*)::int` })
    .from(models)
    .where(gte(models.firstSeenAt, sql`now() - make_interval(days => ${days})`))
    .groupBy(models.primaryCategory)
    .orderBy(desc(sql`count(*)::int`));

  return rows.map((r) => ({ category: r.category, count: Number(r.count) }));
}

export async function getCategories(): Promise<Array<{ key: string; labelEn: string; labelTr: string; sortOrder: number }>> {
  if (!isDbConfigured()) {
    const { CATEGORY_RULES } = await import("../classify/rules.ts");
    return CATEGORY_RULES.map((r) => ({ key: r.key, labelEn: r.labelEn, labelTr: r.labelTr, sortOrder: r.sortOrder }));
  }

  const db = getDb();
  const rows = await db.select().from(categoriesTable).orderBy(categoriesTable.sortOrder);
  return rows.map((r) => ({ key: r.key, labelEn: r.labelEn, labelTr: r.labelTr, sortOrder: r.sortOrder }));
}
