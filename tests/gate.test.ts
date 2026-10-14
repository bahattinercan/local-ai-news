import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateGate, GATE_THRESHOLDS, hasSamples } from "../src/lib/classify/gate.ts";
import type { RawModel } from "../src/lib/model.ts";

function model(overrides: Partial<RawModel>): RawModel {
  return {
    id: "someone/model",
    author: "someone",
    pipelineTag: "text-generation",
    libraryName: null,
    tags: [],
    likes: 0,
    downloads: 0,
    trendingScore: null,
    gated: false,
    createdAt: "2026-10-13T00:00:00.000Z",
    lastModified: "2026-10-13T00:00:00.000Z",
    cardData: null,
    safetensors: null,
    usedStorage: null,
    spaces: [],
    ...overrides
  };
}

test("personal LoRA uploads with zero engagement do not pass the gate", () => {
  const result = evaluateGate(model({ id: "someone/concord-pictogram-lora", tags: ["lora"] }));
  assert.equal(result.passed, false);
  assert.equal(result.reason, "failed");
  assert.equal(result.storeRaw, false);
});

test("likes gate", () => {
  const result = evaluateGate(model({ likes: GATE_THRESHOLDS.likes }));
  assert.equal(result.passed, true);
  assert.equal(result.reason, "likes");
});

test("downloads gate", () => {
  const result = evaluateGate(model({ downloads: GATE_THRESHOLDS.downloads }));
  assert.equal(result.passed, true);
  assert.equal(result.reason, "downloads");
});

test("curated org gate", () => {
  const result = evaluateGate(model({ author: "unsloth", likes: 0, downloads: 0 }));
  assert.equal(result.passed, true);
  assert.equal(result.reason, "org");
});

test("widget samples gate", () => {
  const withWidget = model({ cardData: { widget: [{ text: "x", output: { url: "https://cdn/y.png" } }] } });
  assert.ok(hasSamples(withWidget));
  assert.equal(evaluateGate(withWidget).reason, "samples");
});

test("gate-failed rows are stored only above the raw threshold", () => {
  const weak = evaluateGate(model({ likes: 2, downloads: 12 }));
  assert.equal(weak.passed, false);
  assert.equal(weak.storeRaw, true);
});
