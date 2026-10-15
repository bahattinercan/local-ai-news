import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { CURATED_ORGS, CATEGORY_RULES } from "./classify/rules.ts";
import { evaluateGate } from "./classify/gate.ts";
import { normalizeModel } from "./runner/normalize.ts";
import { HfClient, type RawPaper } from "./sources/hf.ts";
import { fetchFeed, type FeedItem } from "./sources/feeds.ts";
import { newsSources, type SourceDefinition } from "./sources/registry.ts";
import type { ClassifiedModel } from "./model.ts";
import type { Snapshot, SnapshotNews } from "./store.ts";

export interface IngestOptions {
  dryRun: boolean;
  maxPerCategory: number;
  pagesPerCategory: number;
  windowDays: number;
  token?: string;
  maxRequests: number;
  maxDetailLookups?: number;
}

export interface IngestResult {
  itemsTotal: number;
  itemsNew: number;
  itemsGatePassed: number;
  requestsUsed: number;
  detailLookups: number;
  budgetExhausted: boolean;
  categoryDistribution: Record<string, number>;
  newsCount: number;
  /** Sources that failed this run; their previous items were kept (gate G5). */
  feedFailures: string[];
  snapshotPath: string | null;
}

export const RELEASE_RULES = {
  trendingScore: 100,
  likes: 50
};

export function shouldCreateRelease(model: ClassifiedModel): boolean {
  if (!model.qualityPassed) return false;
  return (model.trendingScore ?? 0) >= RELEASE_RULES.trendingScore ||
    model.likes >= RELEASE_RULES.likes ||
    CURATED_ORGS.some((org) => org.toLowerCase() === (model.author ?? "").toLowerCase());
}

export function paperToNews(paper: RawPaper, models: ClassifiedModel[]): SnapshotNews {
  const match = matchModel(paper.title, models);

  return {
    externalId: paper.id,
    kind: "paper",
    title: paper.title,
    summary: paper.summary,
    thumbnail: paper.thumbnail,
    url: `https://huggingface.co/papers/${paper.id}`,
    publishedAt: paper.publishedAt,
    organization: paper.organization ?? null,
    upvotes: paper.upvotes ?? 0,
    modelSlug: match ? match.slug : null,
    categoryKey: match ? match.primaryCategory : null
  };
}

export function releaseToNews(model: ClassifiedModel): SnapshotNews {
  return {
    externalId: `release:${model.externalId}`,
    kind: "release",
    title: `${model.name} — new ${model.primaryCategory} model`,
    summary: `${model.libraryName ?? "unknown"} · ${model.runners.join(", ") || "no runner detected"}`,
    thumbnail: model.sampleImages[0],
    url: model.url,
    publishedAt: model.firstSeenAt,
    organization: model.author,
    upvotes: model.likes,
    modelSlug: model.slug,
    categoryKey: model.primaryCategory
  };
}

/**
 * Model names that appear in the headline are linked back to the model page.
 * Same guard as `paperToNews`: names shorter than four characters match too
 * eagerly to be trusted.
 */
function matchModel(title: string, models: ClassifiedModel[]): ClassifiedModel | undefined {
  const needle = title.toLowerCase();
  return models.find((model) => {
    const name = model.name.toLowerCase();
    return name.length > 3 && needle.includes(name);
  });
}

/**
 * Feed sources share one shape, so the origin is carried by the external id
 * prefix (the dedupe key) and by `organization` for display.
 */
export function feedToNews(item: FeedItem, source: SourceDefinition, models: ClassifiedModel[] = []): SnapshotNews {
  const model = matchModel(item.title, models);
  return {
    externalId: `${source.key}:${item.id}`,
    kind: source.newsKind ?? "announcement",
    title: item.title,
    summary: item.summary ?? undefined,
    url: item.url,
    publishedAt: item.publishedAt,
    // The label identifies the project (llama.cpp, ollama, r/LocalLLaMA) and is
    // stable; a GitHub release author is often a bot account, so it is only a
    // fallback. The poster/release author stays reachable via the source url.
    organization: source.label ?? item.author ?? source.key,
    upvotes: null,
    modelSlug: model ? model.slug : null,
    categoryKey: model ? model.primaryCategory : null
  };
}

/**
 * Gate G5: a source that fails must never empty the feed. Existing items are
 * left untouched, the failure is reported, and the run continues.
 */
export async function ingestFeeds(
  models: ClassifiedModel[],
  news: SnapshotNews[],
  fetchImpl: typeof fetch = fetch
): Promise<string[]> {
  const failures: string[] = [];
  const sources = newsSources().filter((source) => source.format === "atom" || source.format === "rss");

  for (const source of sources) {
    try {
      const items = await fetchFeed(source.baseUrl, source.format === "rss" ? "rss" : "atom", fetchImpl);
      let added = 0;
      for (const item of items) {
        const entry = feedToNews(item, source, models);
        if (news.some((existing) => existing.externalId === entry.externalId)) continue;
        news.push(entry);
        added += 1;
      }
      console.log(`feed ${source.key}: ${added} new / ${items.length} fetched`);
    } catch (error) {
      failures.push(`${source.key}: ${(error as Error).message}`);
      console.warn(`feed ${source.key} failed, keeping previous items: ${(error as Error).message}`);
    }
  }

  return failures;
}

function loadExistingSnapshot(): Snapshot | null {
  const path = join(process.cwd(), "data", "feed.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as Snapshot;
}

export async function runIngest(options: IngestOptions): Promise<IngestResult> {
  const client = new HfClient({ token: options.token, maxRequestsPerWindow: options.maxRequests });
  const now = new Date().toISOString();
  const existing = loadExistingSnapshot();
  const seen = new Set(existing?.models.map((m) => m.externalId) ?? []);

  const models: ClassifiedModel[] = existing?.models ?? [];
  const news: SnapshotNews[] = existing?.news ?? [];
  const distribution: Record<string, number> = {};

  let total = 0;
  let newCount = 0;
  let gatePassed = 0;
  let detailLookups = 0;
  let budgetExhausted = false;
  const maxDetailLookups = options.maxDetailLookups ?? Math.max(0, options.maxRequests - 30);

  async function attempt<T>(call: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("rate limit budget")) {
        budgetExhausted = true;
      }
      return fallback;
    }
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.key === "news" || budgetExhausted) continue;

    let cursor: string | null = null;
    for (let page = 0; page < options.pagesPerCategory; page += 1) {
      const result = await attempt(
        () =>
          client.listModels({
            pipelineTag: rule.pipelineTags[0],
            search: rule.searchQuery,
            sort: "createdAt",
            limit: Math.min(options.maxPerCategory, 100),
            cursor: cursor ?? undefined
          }),
        { items: [], nextCursor: null }
      );
      if (budgetExhausted) break;

      for (const item of result.items) {
        total += 1;
        const gate = evaluateGate(item);
        if (!gate.passed && !gate.storeRaw) continue;

        if (gate.passed && !item.safetensors && detailLookups < maxDetailLookups) {
          const detail = await attempt(() => client.getModel(item.id), null);
          if (detail) {
            detailLookups += 1;
            Object.assign(item, detail);
          }
          if (budgetExhausted) break;
        }

        const normalized = normalizeModel(item, { firstSeenAt: now });
        if (!normalized.categories.includes(rule.key)) normalized.categories.push(rule.key);

        if (gate.passed) gatePassed += 1;

        if (seen.has(normalized.externalId)) continue;
        seen.add(normalized.externalId);
        models.push(normalized);
        newCount += 1;
        distribution[rule.key] = (distribution[rule.key] ?? 0) + 1;

        if (shouldCreateRelease(normalized)) news.push(releaseToNews(normalized));
      }

      cursor = result.nextCursor;
      if (!cursor) break;
    }
  }

  const papers = await attempt(() => client.getDailyPapers(), []);
  for (const paper of papers) {
    const entry = paperToNews(paper, models);
    const existingEntry = news.find((n) => n.externalId === entry.externalId);
    if (existingEntry) {
      existingEntry.upvotes = entry.upvotes;
      continue;
    }
    news.push(entry);
  }

  const feedFailures = await ingestFeeds(models, news);

  const result: IngestResult = {
    itemsTotal: total,
    itemsNew: newCount,
    itemsGatePassed: gatePassed,
    requestsUsed: client.requestsUsed,
    detailLookups,
    budgetExhausted,
    categoryDistribution: distribution,
    newsCount: news.length,
    feedFailures,
    snapshotPath: null
  };

  if (options.dryRun) return result;

  applyOverrides(models);
  models.sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime());
  news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const snapshot: Snapshot = {
    generatedAt: now,
    models: models.slice(0, MAX_SNAPSHOT_MODELS),
    news: news.slice(0, MAX_SNAPSHOT_NEWS)
  };
  const path = join(process.cwd(), "data", "feed.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snapshot, null, 2));
  result.snapshotPath = path;

  return result;
}

const MAX_SNAPSHOT_MODELS = 2000;
const MAX_SNAPSHOT_NEWS = 1000;

function applyOverrides(models: ClassifiedModel[]): void {
  const path = join(process.cwd(), "data", "overrides.json");
  if (!existsSync(path)) return;

  let overrides: Record<string, string>;
  try {
    overrides = JSON.parse(readFileSync(path, "utf-8")) as Record<string, string>;
  } catch {
    return;
  }

  for (const model of models) {
    const override = overrides[model.externalId];
    if (!override) continue;
    model.primaryCategory = override;
    if (!model.categories.includes(override)) model.categories.unshift(override);
  }
}

export function printSourceHealth(rows: Array<{ key: string; status: number | string; items: number; note: string }>): void {
  console.log("SOURCE HEALTH");
  console.log("source".padEnd(18) + "status".padEnd(8) + "items".padEnd(7) + "note");
  for (const row of rows) {
    console.log(row.key.padEnd(18) + String(row.status).padEnd(8) + String(row.items).padEnd(7) + row.note);
  }
}
