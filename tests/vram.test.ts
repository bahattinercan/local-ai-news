import { test } from "node:test";
import assert from "node:assert/strict";
import { bytesPerParam, estimateVramGb, formatParams, kvCacheGb } from "../src/lib/runner/vram.ts";

test("bytes per param by quantization", () => {
  assert.equal(bytesPerParam("BF16"), 2);
  assert.equal(bytesPerParam("FP8"), 1);
  assert.equal(bytesPerParam("Q4_K_M"), 0.5625);
  assert.equal(bytesPerParam("MLX-4bit"), 0.5);
  assert.equal(bytesPerParam("unknown"), 2);
});

test("7B BF16 at 4096 tokens lands near the real 15 GB", () => {
  const params = 7_115_124_736;
  const vram = estimateVramGb(params, "BF16", 4096);
  assert.ok(vram !== null);
  assert.ok(vram > 14 && vram < 16, `got ${vram}`);
});

test("Q4_K_M of the same model is roughly a quarter of BF16", () => {
  const params = 7_115_124_736;
  const bf16 = estimateVramGb(params, "BF16")!;
  const q4 = estimateVramGb(params, "Q4_K_M")!;
  assert.ok(q4 < bf16 * 0.35);
  assert.ok(q4 > 3, `got ${q4}`);
});

test("KV cache grows with context", () => {
  const base = kvCacheGb(7e9, 4096);
  assert.ok(kvCacheGb(7e9, 8192) > base * 1.9);
});

test("zero params returns null instead of a fake number", () => {
  assert.equal(estimateVramGb(0, "BF16"), null);
});

test("formatParams", () => {
  assert.equal(formatParams(7_115_124_736), "7.1B");
  assert.equal(formatParams(600_000_000), "0.60B");
  assert.equal(formatParams(null), "unknown");
});
