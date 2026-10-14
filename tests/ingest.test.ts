import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeModel } from "../src/lib/runner/normalize.ts";
import { paperToNews, releaseToNews, shouldCreateRelease } from "../src/lib/ingest.ts";
import { detectQuantizations, detectRunners } from "../src/lib/runner/detect.ts";
import type { RawModel } from "../src/lib/model.ts";

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
