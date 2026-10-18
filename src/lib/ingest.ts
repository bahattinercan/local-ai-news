import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { CURATED_ORGS, CATEGORY_RULES } from "./classify/rules.ts";
import { evaluateGate } from "./classify/gate.ts";
import { normalizeModel } from "./runner/normalize.ts";
import { HfClient, type RawPaper } from "./sources/hf.ts";
import { fetchFeed, type FeedItem } from "./sources/feeds.ts";
import { newsSources, type SourceDefinition } from "./sources/registry.ts";
import { isPoisonedText } from "./text-guard.ts";
import type { ClassifiedModel } from "./model.ts";
import { loadSnapshot } from "./store.ts";
import type { Snapshot, SnapshotNews } from "./store.ts";

export interface IngestOptions {
  dryRun: boolean;
  maxPerCategory: number;
  pagesPerCategory: number;
  windowDays: number;
  token?: string;
  maxRequests: number;
  maxDetailLookups?: number;
  /** Detail lookups spent on models already in the snapshot (never gated by `seen`). */
  maxBackfills?: number;
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
  /** Models that gained detail data in this run (gate pass, previously missing). */
  backfilled: number;
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

/**
 * Backfill detail data for models already in the snapshot.
 *
 * The main loop skips a known model before enriching it (`if (seen.has(...))
 * continue`), so a model that missed a detail lookup at first sight could never
 * gain one: measured 2026-10-15, 407 models passed the gate but only 300 detail
 * lookups ran, leaving 107 permanently without `files`/`cardMeta`. This pass is
 * keyed on the missing field instead of on `seen`.
 *
 * Fields are merged, never overwritten with a null: the stored `firstSeenAt` and
 * gate verdict are what make a row "new", so they are left alone.
 */
export async function backfillDetails(
  client: HfClient,
  models: ClassifiedModel[],
  limit: number
): Promise<number> {
  const targets = models.filter((model) => model.qualityPassed && !model.gated && !model.files).slice(0, limit);
  let enriched = 0;

  for (const model of targets) {
    let detail = null;
    try {
      detail = await client.getModel(model.externalId);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("rate limit budget")) break;
      continue;
    }
    if (!detail) continue;

    const fresh = normalizeModel(detail, { firstSeenAt: model.firstSeenAt });
    model.files = fresh.files ?? model.files;
    model.cardMeta = fresh.cardMeta ?? model.cardMeta;
    model.storageBytes = fresh.storageBytes ?? model.storageBytes;
    model.paramsTotal = fresh.paramsTotal ?? model.paramsTotal;
    model.paramDtypes = fresh.paramDtypes ?? model.paramDtypes;
    if (fresh.quantizations.length > 0) model.quantizations = fresh.quantizations;
    if (fresh.spaces.length > 0) model.spaces = fresh.spaces;
    if (model.sampleImages.length === 0 && fresh.sampleImages.length > 0) model.sampleImages = fresh.sampleImages;
    enriched += 1;
  }

  return enriched;
}

function loadExistingSnapshot(): Snapshot | null {
  const path = join(process.cwd(), "data", "feed.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as Snapshot;
}

/**
 * An `undefined`, `null`, empty array or **poisoned string** never beats a value
 * the other side has.
 *
 * The poisoned case is not hypothetical: 40 of the 185 news items in the served
 * snapshot carry `"[object Object]"` as `organization`. Because the merge only
 * fills what the older record *lacks*, that string would otherwise survive every
 * future ingest — a wrong value is worse than a missing one, so it counts as
 * missing here.
 */
function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0) ||
    isPoisonedText(value)
  );
}

function mergeRecord<T extends object>(older: T, newer: T): T {
  const merged = { ...(older as Record<string, unknown>) };
  for (const [key, value] of Object.entries(newer)) {
    if (!isEmpty(value) || isEmpty(merged[key])) merged[key] = value;
  }
  return merged as T;
}

/**
 * The site serves whatever `npm run publish` uploaded last, but the ingest job
 * merged into the copy `actions/checkout` put on disk — a file nobody ever
 * re-commits. So every run rebuilt "repo baseline + this run's newest pages" and
 * silently dropped whatever earlier runs had discovered once it fell out of the
 * listing window.
 *
 * Measured 2026-10-16: the served snapshot held models first seen on 13, 14 and
 * 16 October and **none** on 15 October, although the job ran that day.
 *
 * Union the published snapshot with the repo copy, keep the earliest
 * `firstSeenAt` per model, and let the newer record fill fields the older one is
 * missing — history accumulates instead of regressing.
 */
export function mergeSnapshotBases(published: Snapshot | null, repo: Snapshot | null): Snapshot | null {
  if (!published && !repo) return null;

  const models = new Map<string, ClassifiedModel>();
  for (const list of [repo?.models, published?.models]) {
    for (const model of list ?? []) {
      const existing = models.get(model.externalId);
      if (!existing) {
        models.set(model.externalId, model);
        continue;
      }
      const firstSeenAt =
        new Date(existing.firstSeenAt).getTime() <= new Date(model.firstSeenAt).getTime()
          ? existing.firstSeenAt
          : model.firstSeenAt;
      models.set(model.externalId, { ...mergeRecord(existing, model), firstSeenAt });
    }
  }

  const news = new Map<string, SnapshotNews>();
  for (const item of [...(repo?.news ?? []), ...(published?.news ?? [])]) {
    const existing = news.get(item.externalId);
    news.set(item.externalId, existing ? mergeRecord(existing, item) : item);
  }

  return {
    generatedAt: published?.generatedAt ?? repo?.generatedAt ?? new Date().toISOString(),
    models: [...models.values()],
    news: [...news.values()]
  };
}

export async function runIngest(options: IngestOptions): Promise<IngestResult> {
  const client = new HfClient({ token: options.token, maxRequestsPerWindow: options.maxRequests });
  const now = new Date().toISOString();
  /* The published snapshot is the site's truth; the repo copy is only a fallback.
     `loadSnapshot()` prefers the Blob on its own and falls back to the repo file,
     so a missing token or an unreachable store degrades to the old behaviour. */
  const published = await loadSnapshot().catch(() => null);
  const existing = mergeSnapshotBases(published, loadExistingSnapshot());
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
        /* This run is the first sighting, so this download count is the baseline
           that makes an in-window delta measurable later (`lib/heat.ts`). */
        normalized.downloadsAtFirstSeen = normalized.downloads;
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

  // Backfill after the main loop so freshly discovered models get the first
  // slice of the detail budget, and reserve 10 requests of headroom so the
  // listing work is never starved on the next run.
  const backfillBudget = Math.max(
    0,
    Math.min(options.maxBackfills ?? 120, options.maxRequests - client.requestsUsed - 10)
  );
  const backfilled = backfillBudget > 0 ? await backfillDetails(client, models, backfillBudget) : 0;

  const result: IngestResult = {
    itemsTotal: total,
    itemsNew: newCount,
    itemsGatePassed: gatePassed,
    requestsUsed: client.requestsUsed,
    detailLookups,
    budgetExhausted,
    categoryDistribution: distribution,
    newsCount: news.length,
    backfilled,
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
