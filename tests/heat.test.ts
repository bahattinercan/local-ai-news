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

test("growth labels are compact and always signed", () => {
  assert.equal(formatGrowth(0), "+0");
  assert.equal(formatGrowth(842), "+842");
  assert.equal(formatGrowth(12_400), "+12.4k");
  assert.equal(formatGrowth(119_265), "+119.3k");
});
