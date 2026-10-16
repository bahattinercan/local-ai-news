import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeModel } from "../src/lib/runner/normalize.ts";
import { mergeSnapshotBases, paperToNews, releaseToNews, shouldCreateRelease } from "../src/lib/ingest.ts";
import { detectQuantizations, detectRunners } from "../src/lib/runner/detect.ts";
import type { ClassifiedModel, RawModel } from "../src/lib/model.ts";

const base: RawModel = {
  id: "unsloth/LTX-2.5-FP8",
  author: "unsloth",
  pipelineTag: "text-to-video",
  libraryName: "diffusers",
  tags: ["diffusers", "fp8", "int8", "unsloth"],
  likes: 1,
  downloads: 213,
  trendingScore: 12,
  gated: false,
  createdAt: "2026-10-13T01:52:47.000Z",
  lastModified: "2026-10-13T02:12:12.000Z",
  siblings: ["model.safetensors", "samples/int8_convrot_t2v.png"],
  cardData: { license: "other", license_name: "ltx-2.x-community-license-agreement" },
  safetensors: { parameters: { BF16: 7115124736 }, total: 7115124736 },
  usedStorage: 32493258969,
  spaces: ["akhaliq/ltx-25"]
};

test("normalizeModel fills the fields the UI depends on", () => {
  const model = normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" });

  assert.equal(model.primaryCategory, "video");
  assert.equal(model.slug, "unsloth-LTX-2.5-FP8");
  assert.equal(model.qualityPassed, true);
  assert.equal(model.gateReason, "downloads");
  assert.equal(model.license, "other");
  assert.equal(model.paramsTotal, 7115124736);
  assert.ok(model.runners.includes("ComfyUI"));
  assert.ok(model.quantizations.includes("FP8"));
  assert.ok(model.vramEstGb !== null && model.vramEstGb > 3);
  assert.equal(model.url, "https://huggingface.co/unsloth/LTX-2.5-FP8");
});

test("runner detection works from the list payload alone (no safetensors needed)", () => {
  const listOnly: RawModel = {
    ...base,
    safetensors: null,
    siblings: ["qwen-image-2.1-UC-BF16.gguf", "README.md"]
  };
  assert.ok(detectRunners(listOnly).includes("llama.cpp"));
  assert.ok(detectQuantizations(listOnly).includes("BF16"));
});

test("gated models never become a release", () => {
  const gated = normalizeModel({ ...base, gated: true, downloads: 0, likes: 0 }, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  assert.equal(shouldCreateRelease(gated), false);
});

test("release rule fires on trending spike, likes or curated org", () => {
  const model = normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  assert.equal(shouldCreateRelease(model), true); // unsloth is curated

  const weak = normalizeModel({ ...base, author: "someone", likes: 6, trendingScore: 1 }, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  assert.equal(shouldCreateRelease(weak), false);

  const spike = normalizeModel({ ...base, author: "someone", likes: 6, trendingScore: 120 }, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  assert.equal(shouldCreateRelease(spike), true);
});

test("papers link to a model row when the title mentions it", () => {
  const model = normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  const entry = paperToNews(
    { id: "2610.00707", title: "LTX-2.5-FP8 improves video diffusion", publishedAt: "2026-10-13T00:00:00.000Z", upvotes: 4 },
    [model]
  );
  assert.equal(entry.modelSlug, model.slug);
  assert.equal(entry.categoryKey, "video");
  assert.equal(entry.url, "https://huggingface.co/papers/2610.00707");
});

test("dedupe keeps one row per external id", () => {
  const model = normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  const seen = new Set<string>();
  const rows = [model, model];
  const unique = rows.filter((row) => {
    if (seen.has(row.externalId)) return false;
    seen.add(row.externalId);
    return true;
  });
  assert.equal(unique.length, 1);
  assert.ok(releaseToNews(model).kind === "release");
});

// --- Phase 2: feed sources (docs/en/NEWS-PLAN.md) ---

import { feedToNews, ingestFeeds } from "../src/lib/ingest.ts";
import { getSource } from "../src/lib/sources/registry.ts";
import type { SnapshotNews } from "../src/lib/store.ts";
import type { FeedItem } from "../src/lib/sources/feeds.ts";

const feedItem: FeedItem = {
  id: "t3_abc123",
  title: "Qwen2.5-Coder runs great on a 3060",
  summary: "plain text summary",
  url: "https://www.reddit.com/r/LocalLLaMA/comments/abc123/x/",
  publishedAt: "2026-10-15T09:00:00.000Z",
  author: "/u/someone"
};

test("feedToNews namespaces the dedupe key by source", () => {
  const reddit = getSource("reddit_localllama")!;
  const item = feedToNews(feedItem, reddit);

  assert.equal(item.externalId, "reddit_localllama:t3_abc123");
  assert.equal(item.kind, "community");
  // the label names the source; the poster is reachable from the url
  assert.equal(item.summary, "plain text summary");
  assert.equal(item.organization, "r/LocalLLaMA");
  assert.equal(item.url, feedItem.url);
  // no model matches this title, so no cross-link is invented
  assert.equal(item.modelSlug, null);
  assert.equal(item.categoryKey, null);
});

test("feedToNews links a headline back to a model when the name appears", () => {
  const model = normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  const item = feedToNews(
    { ...feedItem, title: "unsloth/LTX-2.5-FP8 is out and it is fast" },
    getSource("gh_llama_cpp")!,
    [model]
  );

  assert.equal(item.kind, "runtime");
  assert.equal(item.modelSlug, model.slug);
  assert.equal(item.categoryKey, model.primaryCategory);
  assert.equal(item.organization, "llama.cpp");
});

test("gate G5: a failing feed keeps the existing items and reports the failure", async () => {
  const existing: SnapshotNews[] = [
    {
      externalId: "reddit_localllama:t3_old",
      kind: "community",
      title: "an older post that must survive",
      url: "https://www.reddit.com/r/LocalLLaMA/comments/old/",
      publishedAt: "2026-10-14T00:00:00.000Z"
    }
  ];

  const failing = (async () => {
    throw new Error("simulated network failure");
  }) as unknown as typeof fetch;

  const failures = await ingestFeeds([], existing, failing);

  assert.equal(existing.length, 1, "the previous item was dropped");
  assert.equal(existing[0].externalId, "reddit_localllama:t3_old");
  assert.ok(failures.length > 0, "the failure was not reported");
});

test("gate G5: a 429 on one source does not empty the feed", async () => {
  const existing: SnapshotNews[] = [];

  const rateLimited = (async () => new Response("too many requests", { status: 429 })) as unknown as typeof fetch;
  const failures = await ingestFeeds([], existing, rateLimited);

  assert.equal(existing.length, 0);
  assert.ok(
    failures.some((line) => line.includes("429")),
    `expected a 429 failure line, got ${JSON.stringify(failures)}`
  );
});

// --- Phase 1: detail backfill for models already in the snapshot ---

import { backfillDetails } from "../src/lib/ingest.ts";
import type { HfClient } from "../src/lib/sources/hf.ts";

function stubClient(detail: RawModel | null): HfClient {
  return { getModel: async () => detail } as unknown as HfClient;
}

test("backfill enriches a model that has no file list yet", async () => {
  const model = normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  assert.equal(model.files ?? null, null);

  const withSizes: RawModel = {
    ...base,
    siblingSizes: [
      { name: "model.safetensors", bytes: 14_000_000_000 },
      { name: "preview.png", bytes: 900_000 },
      { name: "model.Q4_K_M.gguf", bytes: 4_200_000_000 }
    ],
    cardData: { ...base.cardData, base_model: "stabilityai/base", datasets: ["laion"], language: ["en"] }
  };

  const enriched = await backfillDetails(stubClient(withSizes), [model], 5);

  assert.equal(enriched, 1);
  // only weight files, largest first; the png is filtered out
  assert.deepEqual(
    model.files?.map((file) => file.name),
    ["model.safetensors", "model.Q4_K_M.gguf"]
  );
  assert.equal(model.cardMeta?.baseModel, "stabilityai/base");
  assert.deepEqual(model.cardMeta?.datasets, ["laion"]);
  // the fields that define "new" are not touched
  assert.equal(model.firstSeenAt, "2026-10-13T16:00:00.000Z");
  assert.equal(model.qualityPassed, true);
});

test("a model that already has files is not fetched again", async () => {
  const model = normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  model.files = [{ name: "already.safetensors", bytes: 1 }];

  let calls = 0;
  const client = { getModel: async () => { calls += 1; return base; } } as unknown as HfClient;

  assert.equal(await backfillDetails(client, [model], 5), 0);
  assert.equal(calls, 0);
});

test("a failing detail lookup leaves the stored row intact", async () => {
  const model = normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" });
  const before = { ...model };

  const failing = { getModel: async () => { throw new Error("boom"); } } as unknown as HfClient;
  assert.equal(await backfillDetails(failing, [model], 5), 0);
  assert.deepEqual(model, before);
});

test("a rate-limit error stops the backfill instead of hammering the api", async () => {
  const models = [0, 1, 2].map(() => normalizeModel(base, { firstSeenAt: "2026-10-13T16:00:00.000Z" }));
  let calls = 0;
  const limited = {
    getModel: async () => {
      calls += 1;
      throw new Error("rate limit budget exhausted (500 per 300s)");
    }
  } as unknown as HfClient;

  assert.equal(await backfillDetails(limited, models, 3), 0);
  assert.equal(calls, 1, "it kept calling after the budget ran out");
});

/**
 * Regression: the ingest merged into the repo copy of the snapshot while the
 * site served the published Blob one, so a model discovered by an earlier run
 * disappeared again as soon as it left the listing window (measured: the served
 * snapshot had no model first seen on 2026-10-15 although the job ran that day).
 */
test("mergeSnapshotBases keeps every model from both bases", () => {
  const older: ClassifiedModel = {
    ...normalizeModel(base, { firstSeenAt: "2026-10-14T00:00:00.000Z" }),
    externalId: "someone/shared",
    files: [{ name: "model.safetensors", bytes: 10 }]
  };
  const repo = { generatedAt: "2026-10-14T00:00:00.000Z", models: [older], news: [] };
  const published = {
    generatedAt: "2026-10-16T00:00:00.000Z",
    models: [
      // Same model, seen later by the published run and missing `files`.
      { ...older, firstSeenAt: "2026-10-16T00:00:00.000Z", files: null },
      { ...older, externalId: "someone/only-published", firstSeenAt: "2026-10-16T00:00:00.000Z" }
    ],
    news: []
  };

  const merged = mergeSnapshotBases(published, repo);
  assert.ok(merged);
  assert.equal(merged.models.length, 2);

  const shared = merged.models.find((model) => model.externalId === "someone/shared");
  // The earlier first sighting wins, and the newer record cannot blank a field.
  assert.equal(shared?.firstSeenAt, "2026-10-14T00:00:00.000Z");
  assert.equal(shared?.files?.length, 1);
  assert.ok(merged.models.some((model) => model.externalId === "someone/only-published"));
});

test("mergeSnapshotBases dedupes news by id and survives a missing side", () => {
  const item = { externalId: "paper:1", kind: "paper" as const, title: "old", url: "u", publishedAt: "2026-10-14T00:00:00.000Z" };
  const merged = mergeSnapshotBases(
    { generatedAt: "2026-10-16T00:00:00.000Z", models: [], news: [{ ...item, upvotes: 9 }] },
    { generatedAt: "2026-10-14T00:00:00.000Z", models: [], news: [item] }
  );
  assert.equal(merged?.news.length, 1);
  assert.equal(merged?.news[0]?.upvotes, 9);

  assert.equal(mergeSnapshotBases(null, null), null);
  assert.equal(mergeSnapshotBases(null, { generatedAt: "x", models: [], news: [] })?.generatedAt, "x");
});
