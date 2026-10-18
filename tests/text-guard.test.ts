import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLabel, isPoisonedText } from "../src/lib/text-guard.ts";
import { normalizeNews, type Snapshot } from "../src/lib/store.ts";
import type { SnapshotNews } from "../src/lib/store.ts";

/**
 * Measured 2026-10-18 on the served snapshot: 40 of 185 news items (`paper` kind)
 * carried the literal string "[object Object]" as `organization`. Whatever wrote
 * it, a byline may be absent but must never be a stringified object.
 */
test("a stringified object is not a label", () => {
  assert.equal(isPoisonedText("[object Object]"), true);
  assert.equal(isPoisonedText("[object Promise]"), true);
  assert.equal(isPoisonedText(" [object Object] "), true);
  assert.equal(isPoisonedText("Object"), false);
  assert.equal(isPoisonedText("[object"), false);
  assert.equal(isPoisonedText(undefined), false);
  assert.equal(isPoisonedText({}), false);

  assert.equal(cleanLabel("[object Object]"), null);
  assert.equal(cleanLabel(""), null);
  assert.equal(cleanLabel("   "), null);
  assert.equal(cleanLabel(null), null);
  assert.equal(cleanLabel("Peking University"), "Peking University");
  assert.equal(cleanLabel("  NAVER AI Lab "), "NAVER AI Lab");
});

function snapshotWith(news: Array<Partial<SnapshotNews>>): Snapshot {
  return { generatedAt: "2026-10-18T09:09:12.621Z", models: [], news: news as SnapshotNews[] };
}

test("the store never serves a poisoned news label", () => {
  const [poisoned, missing, fine] = normalizeNews(
    snapshotWith([
      { externalId: "a", kind: "paper", title: "A", url: "u", publishedAt: "2026-10-18T00:00:00Z", organization: "[object Object]" },
      { externalId: "b", kind: "paper", title: "B", url: "u", publishedAt: "2026-10-18T00:00:00Z", organization: null },
      { externalId: "c", kind: "paper", title: "C", url: "u", publishedAt: "2026-10-18T00:00:00Z", organization: "Qwen" }
    ])
  );

  assert.equal(poisoned.organization, null);
  assert.equal(missing.organization, null);
  assert.equal(fine.organization, "Qwen");
});

test("news normalisation still degrades to an empty list", () => {
  assert.deepEqual(normalizeNews({ generatedAt: "x", models: [] } as unknown as Snapshot), []);
  // An empty title is not a title; the UI falls back to its own "Update" label.
  const [untitled] = normalizeNews(snapshotWith([{ externalId: "a", kind: "runtime", title: "   ", url: "u", publishedAt: "2026-10-18T00:00:00Z" }]));
  assert.equal(untitled.title, "");
});
