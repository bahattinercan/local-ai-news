import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { CURATED_ORGS, CATEGORY_RULES } from "./classify/rules.ts";
import { evaluateGate } from "./classify/gate.ts";
import { normalizeModel } from "./runner/normalize.ts";
import { HfClient, type RawPaper } from "./sources/hf.ts";
import type { ClassifiedModel } from "./model.ts";
import type { Snapshot, SnapshotNews } from "./db/store.ts";

export interface IngestOptions {
  dryRun: boolean;
  maxPerCategory: number;
  pagesPerCategory: number;
  windowDays: number;
  token?: string;
  maxRequests: number;
}

export interface IngestResult {
  itemsTotal: number;
  itemsNew: number;
  itemsGatePassed: number;
  requestsUsed: number;
  categoryDistribution: Record<string, number>;
  newsCount: number;
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
  const needle = paper.title.toLowerCase();
  const match = models.find((m) => {
    const name = m.name.toLowerCase();
    return name.length > 3 && needle.includes(name);
  });

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

  for (const rule of CATEGORY_RULES) {
    if (rule.key === "news") continue;

    let cursor: string | null = null;
    for (let page = 0; page < options.pagesPerCategory; page += 1) {
      const result = await client.listModels({
        pipelineTag: rule.pipelineTags[0],
        sort: "createdAt",
        limit: Math.min(options.maxPerCategory, 100),
        cursor: cursor ?? undefined
      });

      for (const item of result.items) {
        total += 1;
        const gate = evaluateGate(item);
        if (!gate.passed && !gate.storeRaw) continue;

        if (gate.passed && !item.safetensors && client.requestsUsed < options.maxRequests - 10) {
          try {
            const detail = await client.getModel(item.id);
            Object.assign(item, detail);
          } catch {
            /* detail is optional; keep the list payload */
          }
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

  const papers = await client.getDailyPapers();
  for (const paper of papers) {
    const entry = paperToNews(paper, models);
    const existingEntry = news.find((n) => n.externalId === entry.externalId);
    if (existingEntry) {
      existingEntry.upvotes = entry.upvotes;
      continue;
    }
    news.push(entry);
  }

  const result: IngestResult = {
    itemsTotal: total,
    itemsNew: newCount,
    itemsGatePassed: gatePassed,
    requestsUsed: client.requestsUsed,
    categoryDistribution: distribution,
    newsCount: news.length,
    snapshotPath: null
  };

  if (options.dryRun) return result;

  const snapshot: Snapshot = { generatedAt: now, models, news };
  const path = join(process.cwd(), "data", "feed.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snapshot, null, 2));
  result.snapshotPath = path;

  return result;
}

export function printSourceHealth(rows: Array<{ key: string; status: number | string; items: number; note: string }>): void {
  console.log("SOURCE HEALTH");
  console.log("source".padEnd(18) + "status".padEnd(8) + "items".padEnd(7) + "note");
  for (const row of rows) {
    console.log(row.key.padEnd(18) + String(row.status).padEnd(8) + String(row.items).padEnd(7) + row.note);
  }
}
