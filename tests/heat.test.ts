import { test } from "node:test";
import assert from "node:assert/strict";
import { GROWTH_COVERAGE_GATE, formatGrowth, growthCoverage, growthOf, hasGrowthSignal } from "../src/lib/heat.ts";
import type { ClassifiedModel } from "../src/lib/model.ts";

function model(overrides: Partial<ClassifiedModel>): ClassifiedModel {
  return { externalId: "someone/model", name: "model", downloads: 0, likes: 0, ...overrides } as ClassifiedModel;
}

/**
 * `trendingScore` is null on every model in the served snapshot (measured
 * 1 633/1 633) and the snapshot keeps no download history, so the only honest way
 * to print growth is the baseline the ingest stores on the first sighting.
 */
test("growth is a delta from the first sighting, and unknown when there is no baseline", () => {
  assert.equal(growthOf(model({ downloads: 500, downloadsAtFirstSeen: 200 })), 300);
  assert.equal(growthOf(model({ downloads: 200, downloadsAtFirstSeen: 200 })), 0);
  // Null baseline is the normal case for everything discovered before the field.
  assert.equal(growthOf(model({ downloads: 500, downloadsAtFirstSeen: null })), null);
  assert.equal(growthOf(model({ downloads: 500 })), null);
  // A shrinking count is a Hub re-count, not negative growth.
  assert.equal(growthOf(model({ downloads: 100, downloadsAtFirstSeen: 900 })), null);
});

test("the band only prints a delta when the column is mostly filled", () => {
  const measured = (n: number, total: number) => [
    ...Array.from({ length: n }, (_, i) => model({ externalId: `m${i}`, downloads: 10, downloadsAtFirstSeen: 1 })),
    ...Array.from({ length: total - n }, (_, i) => model({ externalId: `x${i}`, downloads: 10, downloadsAtFirstSeen: null }))
  ];

  assert.equal(growthCoverage(measured(2, 4)), 0.5);
  assert.equal(growthCoverage([]), 0);
  assert.equal(hasGrowthSignal(measured(2, 4)), false);
  assert.equal(hasGrowthSignal(measured(3, 4)), true);
  assert.equal(growthCoverage(measured(3, 4)) >= GROWTH_COVERAGE_GATE, true);
  // A single row can never justify a percentage column, even at 100 % coverage.
  assert.equal(hasGrowthSignal(measured(1, 1)), false);
  // A band that is all-null must never render "+0".
  assert.equal(hasGrowthSignal(measured(0, 12)), false);
});

test("a band of flat deltas keeps the column dormant instead of printing +0", () => {
  // Measured on the live site against docs/en/DESIGN-V3.md P0-2: the eight rows of
  // "Most downloaded" all printed a green "+0" - every baseline existed, but none
  // had moved since first sighting, so the column showed a zero, not a delta.
  const flat = Array.from({ length: 8 }, (_, i) =>
    model({ externalId: `flat${i}`, downloads: 8_000, downloadsAtFirstSeen: 8_000 })
  );
  assert.equal(growthCoverage(flat), 1); // measurable...
  assert.equal(hasGrowthSignal(flat), false); // ...but nothing to show
  assert.equal(hasGrowthSignal([]), false);

  // A non-zero share has to clear the same gate: 5 of 8 moved is enough, 4 is not.
  const moved = (movedCount: number) =>
    Array.from({ length: 8 }, (_, i) =>
      model({
        externalId: `mix${i}`,
        downloads: i < movedCount ? 8_500 : 8_000,
        downloadsAtFirstSeen: 8_000
      })
    );
  assert.equal(hasGrowthSignal(moved(4)), false);
  assert.equal(hasGrowthSignal(moved(5)), true);
});

test("growth labels are compact and always signed", () => {
  assert.equal(formatGrowth(0), "+0");
  assert.equal(formatGrowth(842), "+842");
  assert.equal(formatGrowth(12_400), "+12.4k");
  assert.equal(formatGrowth(119_265), "+119.3k");
});
