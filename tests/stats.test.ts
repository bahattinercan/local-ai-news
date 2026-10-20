import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FOLDED_CATEGORY,
  buildStatsBoard,
  fillDaily,
  foldSlices,
  medianOf,
  type StatsSnapshot
} from "../src/lib/stats.ts";
import { normalizeFeedQuery, parseStatsQuery, windowFromDays } from "../src/lib/query.ts";
import type { ClassifiedModel } from "../src/lib/model.ts";

/**
 * The Data Desk's tests (docs/en/STATS-PLAN.md §9).
 *
 * The regression these exist for, measured on the live snapshot 2026-10-20:
 * `firstSeenAt` spanned three days, so `days=7|30|90|180` all returned 606, and
 * the "daily volume" chart drew those three ingest batches as the ecosystem's
 * release cadence. Everything below keeps the two axes apart.
 */

const NOW = "2026-10-20T12:00:00.000Z";

function model(overrides: Partial<ClassifiedModel> & { externalId: string }): ClassifiedModel {
  return {
    slug: overrides.externalId,
    name: overrides.externalId,
    author: null,
    primaryCategory: "coding",
    categories: ["coding"],
    pipelineTag: null,
    libraryName: null,
    license: null,
    licenseName: null,
    createdAt: "2026-10-18T00:00:00.000Z",
    updatedAt: "",
    firstSeenAt: "2026-10-19T00:00:00.000Z",
    downloads: 0,
    likes: 0,
    trendingScore: null,
    gated: false,
    qualityPassed: true,
    gateReason: "downloads",
    paramsTotal: null,
    paramDtypes: null,
    storageBytes: null,
    quantizations: [],
    runners: [],
    vramEstGb: null,
    sampleImages: [],
    spaces: [],
    url: "https://huggingface.co/x",
    ...overrides
  } as ClassifiedModel;
}

function snapshot(models: ClassifiedModel[]): StatsSnapshot {
  return { generatedAt: NOW, models, news: [] };
}

test("fillDaily zero-fills the whole window and keeps the total", () => {
  const filled = fillDaily([{ date: "2026-10-18", count: 3 }], 5, NOW, (date) => ({ date, count: 0 }));
  assert.equal(filled.length, 5);
  assert.deepEqual(
    filled.map((point) => point.date),
    ["2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20"]
  );
  assert.equal(filled.reduce((sum, point) => sum + point.count, 0), 3);
  // The live page drew a 6-day ingest hole (14 → 20 Oct) as a continuous line.
  assert.equal(filled.filter((point) => point.count === 0).length, 4);
});

test("fillDaily ends on the snapshot's clock, not the wall clock", () => {
  const filled = fillDaily<{ date: string }>([], 2, "2026-01-10T23:59:00.000Z", (date) => ({ date }));
  assert.deepEqual(filled.map((point) => point.date), ["2026-01-09", "2026-01-10"]);
});

test("the cadence series reads createdAt, not firstSeenAt", () => {
  const board = buildStatsBoard(
    snapshot([
      // Created today, first seen today.
      model({ externalId: "a/one", createdAt: "2026-10-20T01:00:00.000Z", firstSeenAt: "2026-10-20T02:00:00.000Z" }),
      // Created today but first seen three days ago (a re-appearing repo).
      model({ externalId: "a/two", createdAt: "2026-10-20T03:00:00.000Z", firstSeenAt: "2026-10-17T02:00:00.000Z" }),
      // Created long ago, first seen today (the common case on this snapshot: 49 days of repos, 3 of sightings).
      model({ externalId: "a/three", createdAt: "2026-09-01T03:00:00.000Z", firstSeenAt: "2026-10-20T04:00:00.000Z" })
    ]),
    { windowDays: 7, gate: "passed" }
  );

  const today = board.cadence.find((point) => point.date === "2026-10-20");
  assert.equal(today?.created, 2, "two repos were created today");
  assert.equal(board.totals.inView, 3, "all three were first seen inside the 7-day window");
  assert.equal(board.cadence.reduce((sum, point) => sum + point.created, 0), 2);
});

test("categories: the view and the gate panel are separate measurements", () => {
  const board = buildStatsBoard(
    snapshot([
      model({ externalId: "a/ok", primaryCategory: "coding", qualityPassed: true }),
      model({ externalId: "a/no", primaryCategory: "coding", qualityPassed: false, gateReason: "failed" }),
      model({ externalId: "a/robo", primaryCategory: "robotics", qualityPassed: false, gateReason: "failed" }),
      model({ externalId: "a/gated", primaryCategory: "coding", gated: true, qualityPassed: false, gateReason: "failed" })
    ]),
    { windowDays: 30, gate: "passed" }
  );

  // §2 shows the view: only the passing row.
  const coding = board.categories.find((row) => row.category === "coding");
  assert.equal(coding?.count, 1);
  // §5 shows the gate: tracked/passed for every category, including the 0 % one.
  assert.equal(coding?.tracked, 2);
  assert.equal(coding?.passed, 1);
  const robotics = board.categories.find((row) => row.category === "robotics");
  assert.equal(robotics?.tracked, 1);
  assert.equal(robotics?.passed, 0);
  assert.equal(robotics?.count, 0);

  assert.equal(board.totals.inView, 1);
  assert.equal(board.totals.tracked, 3);
  assert.equal(board.totals.passed, 1);
  assert.equal(board.totals.gated, 1);
});

test("the gate segments sum to every tracked row, and gated rows are counted once", () => {
  const board = buildStatsBoard(
    snapshot([
      model({ externalId: "a/pass-dl", qualityPassed: true, gateReason: "downloads" }),
      model({ externalId: "a/pass-likes", qualityPassed: true, gateReason: "likes" }),
      model({ externalId: "a/fail", qualityPassed: false, gateReason: "failed" }),
      // A gated repo carries gateReason "failed"; counting it there too would
      // make the segments sum to one row more than the snapshot holds.
      model({ externalId: "a/gated", gated: true, qualityPassed: false, gateReason: "failed" })
    ]),
    { windowDays: 30, gate: "passed" }
  );

  const reasons = board.gateReasons;
  const sum = reasons.downloads + reasons.likes + reasons.org + reasons.samples + reasons.failed + reasons.gated;
  assert.equal(sum, 4);
  assert.equal(reasons.downloads, 1);
  assert.equal(reasons.likes, 1);
  assert.equal(reasons.failed, 1);
  assert.equal(reasons.gated, 1);
  assert.equal(board.totals.tracked + board.totals.gated, 4);
});

test("the view sums: category counts and shares agree with the totals", () => {
  const board = buildStatsBoard(
    snapshot([
      model({ externalId: "a/1", primaryCategory: "coding", downloads: 10, runners: ["transformers"] }),
      model({ externalId: "a/2", primaryCategory: "coding", downloads: 30 }),
      model({ externalId: "a/3", primaryCategory: "video", downloads: 0 }),
      model({ externalId: "a/4", primaryCategory: "video", qualityPassed: false, gateReason: "failed" })
    ]),
    { windowDays: 30, gate: "all" }
  );

  const countSum = board.categories.reduce((sum, row) => sum + row.count, 0);
  assert.equal(countSum, board.totals.inView);
  assert.equal(board.totals.inView, 4, "gate=all counts the failed row too");
  const shareSum = board.categories.reduce((sum, row) => sum + row.share, 0);
  assert.ok(Math.abs(shareSum - 1) < 1e-9);
  assert.equal(board.totals.withRunner, 1);
  // The median ignores rows with zero downloads rather than dragging it to 0.
  const coding = board.categories.find((row) => row.category === "coding");
  assert.equal(coding?.medianDownloads, 20);
  const video = board.categories.find((row) => row.category === "video");
  assert.equal(video?.medianDownloads, null);
});

test("medianOf: odd, even, zero-free, empty", () => {
  assert.equal(medianOf([5]), 5);
  assert.equal(medianOf([4, 2]), 3);
  assert.equal(medianOf([10, 2, 7]), 7);
  assert.equal(medianOf([]), null);
});

test("foldSlices keeps the total, caps the slices and names the tail", () => {
  const rows = Array.from({ length: 9 }, (_, index) => ({
    category: `c${index}`,
    count: 9 - index,
    share: (9 - index) / 45,
    medianDownloads: null,
    tracked: 9 - index,
    passed: 9 - index,
    passRate: 1
  }));

  const folded = foldSlices(rows, 6);
  assert.equal(folded.length, 7);
  assert.equal(folded.at(-1)?.category, FOLDED_CATEGORY);
  assert.deepEqual(folded.at(-1)?.members, ["c6", "c7", "c8"]);
  assert.equal(folded.reduce((sum, slice) => sum + slice.count, 0), rows.reduce((sum, row) => sum + row.count, 0));
  assert.equal(foldSlices(rows.slice(0, 5), 6).length, 5, "a short list is not folded");
});

test("runners never exceed the rows in view", () => {
  const board = buildStatsBoard(
    snapshot([
      model({ externalId: "a/1", runners: ["transformers", "llama.cpp"] }),
      model({ externalId: "a/2", runners: ["transformers"] }),
      model({ externalId: "a/3", runners: [] })
    ]),
    { windowDays: 30, gate: "passed" }
  );

  const total = board.runners.reduce((sum, row) => sum + row.inView, 0);
  assert.ok(total > board.totals.withRunner, "multi-tag rows are counted once per tag");
  for (const row of board.runners) assert.ok(row.inView <= board.totals.inView);
  assert.equal(board.runners[0]?.runner, "transformers");
});

test("parseStatsQuery speaks the feed's window vocabulary and keeps the old links working", () => {
  assert.equal(parseStatsQuery({}).window, "30d");
  assert.equal(parseStatsQuery({ days: "7" }).window, "7d");
  assert.equal(parseStatsQuery({ days: "180" }).window, "90d");
  assert.equal(parseStatsQuery({ window: "abc" }).window, "30d");
  assert.equal(parseStatsQuery({ window: "24h" }).windowDays, 1);
  // The alias loses to an explicit window.
  assert.equal(parseStatsQuery({ window: "7d", days: "90" }).window, "7d");
  assert.equal(windowFromDays(5), "7d");
  assert.equal(windowFromDays(45), "90d");
});

test("gate=all is allowed on an aggregate surface inside 30 days, and clamped above it", () => {
  const short = parseStatsQuery({ window: "30d", gate: "all" });
  assert.equal(short.gate, "all");
  assert.equal(short.gateForced, false);

  const long = parseStatsQuery({ window: "90d", gate: "all" });
  assert.equal(long.gate, "passed");
  assert.equal(long.gateForced, true);

  // The feed keeps decision 9 untouched: no category, no "everything".
  assert.equal(normalizeFeedQuery({ window: "30d", gate: "all", sort: "new", limit: 24, page: 1 }).gate, "passed");
});
