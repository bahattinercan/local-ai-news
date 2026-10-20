import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMPARE_CAP,
  allRows,
  bestIndexes,
  compareHref,
  compareRows,
  compareSlugOf,
  daysTracked,
  downloadsPerDay,
  parseCompareIds,
  splitResolved,
  suggestPairs,
  topDifferences
} from "../src/lib/compare.ts";
import type { ClassifiedModel } from "../src/lib/model.ts";

const NOW = Date.parse("2026-10-20T12:00:00Z");

function model(overrides: Partial<ClassifiedModel> = {}): ClassifiedModel {
  return {
    externalId: "owner/model",
    slug: "owner-model",
    name: "model",
    author: "owner",
    primaryCategory: "llm",
    categories: ["llm"],
    pipelineTag: "text-generation",
    libraryName: "transformers",
    license: "apache-2.0",
    licenseName: null,
    createdAt: "2026-10-14T00:00:00Z",
    updatedAt: "2026-10-14T00:00:00Z",
    firstSeenAt: "2026-10-14T00:00:00Z",
    downloads: 1000,
    likes: 10,
    trendingScore: null,
    gated: false,
    qualityPassed: true,
    gateReason: "",
    paramsTotal: null,
    paramDtypes: null,
    storageBytes: null,
    quantizations: [],
    runners: [],
    vramEstGb: null,
    sampleImages: [],
    spaces: [],
    url: "https://huggingface.co/owner/model",
    ...overrides
  };
}

/**
 * The empty state documented `?ids=owner/model` and it never resolved, because the
 * stored slug comes from `slugify(externalId)` and `slugify` turns `/` into `-`.
 * These are the forms a reader actually has (docs/en/COMPARE-PLAN.md C1).
 */
test("every address form a reader has resolves to the stored slug", () => {
  assert.equal(compareSlugOf("owner/model"), "owner-model");
  assert.equal(compareSlugOf("owner-model"), "owner-model");
  assert.equal(compareSlugOf("https://huggingface.co/owner/model"), "owner-model");
  assert.equal(compareSlugOf("https://huggingface.co/owner/model/tree/main"), "owner-model");
  assert.equal(compareSlugOf("http://www.huggingface.co/owner/model?foo=1"), "owner-model");
  assert.equal(compareSlugOf("  owner/model  "), "owner-model");
  assert.equal(compareSlugOf("<owner/model>"), "owner-model");
  assert.equal(compareSlugOf(""), null);
});

test("ids are split, decoded, deduped, capped and reported", () => {
  assert.deepEqual(parseCompareIds("a,b").slugs, ["a", "b"]);
  assert.deepEqual(parseCompareIds(" a , b ").slugs, ["a", "b"]);
  assert.deepEqual(parseCompareIds("a%2Cb").slugs, ["a", "b"]);
  assert.deepEqual(parseCompareIds("owner/model,other/model").slugs, ["owner-model", "other-model"]);
  // Order is the baseline order, so it must survive parsing untouched.
  assert.deepEqual(parseCompareIds("b,a").slugs, ["b", "a"]);

  const duplicate = parseCompareIds("owner/model,owner-model");
  assert.deepEqual(duplicate.slugs, ["owner-model"]);
  assert.deepEqual(duplicate.duplicates, ["owner-model"]);

  const overflow = parseCompareIds("a,b,c,d,e,f");
  assert.equal(overflow.slugs.length, COMPARE_CAP);
  assert.deepEqual(overflow.overflow, ["e", "f"]);

  // Blank is "not set" (the `cleanSearch` rule), so parsing reports nothing at all.
  const blank = parseCompareIds("");
  assert.deepEqual(blank.slugs, []);
  assert.deepEqual(blank.tokens, []);
  assert.deepEqual(blank.duplicates, []);
  assert.deepEqual(blank.overflow, []);
  assert.deepEqual(parseCompareIds(", ,").slugs, []);
  // A malformed escape yields the raw token instead of throwing.
  assert.deepEqual(parseCompareIds("%E0%A4%A").slugs, ["%E0%A4%A".replace(/[^A-Za-z0-9._-]/g, "-")]);
});

test("the snapshot decides what is rejected, and the order is preserved", () => {
  const resolved = splitResolved(parseCompareIds("a,nope,owner/b").tokens, [
    model({ slug: "a" }),
    model({ slug: "owner-b" })
  ]);
  assert.deepEqual(resolved.models.map((row) => row.slug), ["a", "owner-b"]);
  assert.deepEqual(resolved.rejected, ["nope"]);
  // A rejected address is quoted as the reader typed it, not as a slug.
  assert.deepEqual(splitResolved(parseCompareIds("owner/nope").tokens, []).rejected, ["owner/nope"]);
});

test("downloads per day is downloads over days since first sighting", () => {
  const api = model({ downloads: 700, firstSeenAt: "2026-10-13T12:00:00Z" });
  assert.equal(downloadsPerDay(api, NOW), 100);
  // Seen today: one day, never a division by zero.
  assert.equal(downloadsPerDay(model({ downloads: 5, firstSeenAt: "2026-10-20T09:00:00Z" }), NOW), 5);
  // No downloads or no sighting date means no number, not a zero.
  assert.equal(downloadsPerDay(model({ downloads: 0 }), NOW), null);
  assert.equal(daysTracked("2026-10-14T12:00:00Z", NOW), 6);
});

/**
 * C5: a row exists only when a compared model reports it. Measured on the served
 * snapshot, `paramsTotal` is present on 17.7 % of rows and `vramEstGb` on 17.2 %,
 * so the fixed 8-row sheet was mostly dashes.
 */
test("a row nobody reports does not exist", () => {
  const plain = [model({ slug: "a" }), model({ slug: "b", externalId: "owner/b" })];
  const rows = allRows(compareRows(plain, "en", { now: NOW }));
  assert.ok(!rows.some((row) => row.key === "params"), "params must collapse when nobody reports it");
  assert.ok(!rows.some((row) => row.key === "vram"));
  // Rows that both report survive.
  assert.ok(rows.some((row) => row.key === "downloads"));
  assert.ok(rows.some((row) => row.key === "gate"));
});

test("a row reported by one model renders, and gets no best mark", () => {
  const specced = model({ slug: "a", paramsTotal: 7_000_000_000 });
  const plain = model({ slug: "b", externalId: "owner/b" });
  const rows = allRows(compareRows([specced, plain], "en", { now: NOW }));
  const params = rows.find((row) => row.key === "params");
  assert.ok(params);
  assert.equal(params.reported, 1);
  assert.equal(params.values[0].text, "7.0B");
  assert.equal(params.values[1].text, null);
  assert.deepEqual(bestIndexes(params), []);
  assert.ok(params.values.every((cell) => cell.best === false));
});

/**
 * C7/C8: the direction is a stated per-row rule and every tie is marked. The old
 * sheet called the *smallest* params count "best" (`min`) and marked only the
 * first of two equal maxima.
 */
test("direction decides best, ties are all marked, params never wins", () => {
  const small = model({ slug: "a", downloads: 500, storageBytes: 2_000_000_000 });
  const big = model({ slug: "b", externalId: "owner/b", downloads: 500, storageBytes: 6_000_000_000 });
  const rows = allRows(compareRows([small, big], "en", { now: NOW }));

  const downloads = rows.find((row) => row.key === "downloads")!;
  assert.deepEqual(bestIndexes(downloads), [0, 1], "an exact tie marks both columns");

  const weights = rows.find((row) => row.key === "weights")!;
  assert.deepEqual(bestIndexes(weights), [0], "the smaller weights file is best when direction is min");

  const params = rows.find((row) => row.key === "params");
  assert.equal(params, undefined, "no params reported by either model");
  const specced = compareRows(
    [model({ slug: "a", paramsTotal: 8e9 }), model({ slug: "b", externalId: "owner/b", paramsTotal: 2e9 })],
    "en",
    { now: NOW }
  );
  const paramsRow = allRows(specced).find((row) => row.key === "params")!;
  assert.equal(paramsRow.direction, null);
  assert.deepEqual(bestIndexes(paramsRow), [], "a smaller model is not a better model");
});

test("deltas are against the first column, and absent when incomparable", () => {
  const baseline = model({ slug: "a", downloads: 1000, storageBytes: 6_000_000_000 });
  const other = model({
    slug: "b",
    externalId: "owner/b",
    downloads: 2500,
    storageBytes: null,
    likes: 10
  });
  const rows = allRows(compareRows([baseline, other], "en", { now: NOW }));

  const downloads = rows.find((row) => row.key === "downloads")!;
  assert.equal(downloads.values[0].delta, null, "the baseline has nothing to compare against");
  assert.equal(downloads.values[1].delta, "+1.5k");

  const weights = rows.find((row) => row.key === "weights")!;
  assert.equal(weights.values[1].text, null);
  assert.equal(weights.values[1].delta, null, "a missing value never gets a delta");

  const likes = rows.find((row) => row.key === "likes")!;
  assert.equal(likes.values[1].delta, null, "equal values print no delta");
});

test("top differences only quote numbers that a row prints", () => {
  const slow = model({ slug: "a", downloads: 700, firstSeenAt: "2026-10-13T12:00:00Z" });
  const fast = model({
    slug: "b",
    externalId: "owner/b",
    downloads: 7000,
    firstSeenAt: "2026-10-13T12:00:00Z",
    storageBytes: 6_000_000_000
  });
  const groups = compareRows([slow, fast], "en", { now: NOW });
  const differences = topDifferences(groups);

  assert.ok(differences.length > 0);
  assert.ok(differences.length <= 3);
  for (const difference of differences) {
    const printed = allRows(groups).some(
      (row) => row.label === difference.label && row.values.some((cell) => cell.text === difference.right)
    );
    assert.ok(printed, `"${difference.label}" must also be printed in a row`);
    assert.notEqual(difference.left, difference.right);
  }
  // 7000 vs 700 is 10×: the largest gap leads.
  assert.equal(differences[0].ratio, "10.0×");
});

test("suggested pairs prefer categories where both models carry specs", () => {
  const pool = [
    model({ slug: "img-a", primaryCategory: "image", paramsTotal: 2e9, vramEstGb: 5 }),
    model({ slug: "img-b", primaryCategory: "image", paramsTotal: 4e9, vramEstGb: 9 }),
    model({ slug: "img-c", primaryCategory: "image" }),
    model({ slug: "llm-a", primaryCategory: "llm" }),
    model({ slug: "llm-b", primaryCategory: "llm", externalId: "owner/llm-b" })
  ];
  const pairs = suggestPairs(pool, 2);
  const image = pairs.find((pair) => pair.category === "image");
  assert.ok(image);
  assert.deepEqual(
    image!.models.map((row) => row.slug),
    ["img-a", "img-b"]
  );
  // A category with a single model cannot produce a pair.
  assert.ok(!pairs.some((pair) => pair.category === "audio"));
});

test("the canonical address keeps order and encodes each slug", () => {
  assert.equal(compareHref("en", []), "/en/compare");
  assert.equal(compareHref("tr", ["b", "a"]), "/tr/compare?ids=b,a");
  assert.equal(compareHref("en", ["a b"]), "/en/compare?ids=a%20b");
});

test("groups keep the sheet's order and drop the empty ones", () => {
  const groups = compareRows([model({ slug: "a" }), model({ slug: "b", externalId: "owner/b" })], "en", {
    now: NOW
  });
  assert.deepEqual(
    groups.map((group) => group.key),
    ["runs", "traction", "provenance"],
    "the fit group collapses when no model reports a size, params or a VRAM estimate"
  );
  // Everything reports a gate and a first sighting, so every remaining group has rows.
  assert.equal(groups[0].reported, 2);
});
