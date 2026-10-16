import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSearch, parseFeedQuery, parseNewsQuery } from "../src/lib/query.ts";

/**
 * Regression: a GET form submits every named control, so pressing "Apply" with
 * an untouched select (or an empty search box) produced
 * `?window=7d&runner=&maxParams=&license=&q=`, Zod threw, and the page answered
 * 500 instead of rendering the feed.
 */
test("blank form fields are treated as absent, not as invalid", () => {
  const query = parseFeedQuery({
    window: "7d",
    sort: "new",
    gate: "passed",
    runner: "",
    maxParams: "",
    license: "",
    q: ""
  });

  assert.equal(query.runner, undefined);
  assert.equal(query.maxParams, undefined);
  assert.equal(query.license, undefined);
  assert.equal(query.q, undefined);
  assert.equal(query.windowDays, 7);
  assert.equal(query.page, 1);
});

test("whitespace-only values are blank too", () => {
  const query = parseFeedQuery({ q: "   ", runner: "\t" });

  assert.equal(query.q, undefined);
  assert.equal(query.runner, undefined);
});

test("a hand-edited query degrades to the defaults instead of throwing", () => {
  const query = parseFeedQuery({ window: "1y", sort: "cheapest", gate: "maybe", maxParams: "abc", limit: "999", page: "0" });

  assert.equal(query.windowDays, 7);
  assert.equal(query.sort, "new");
  assert.equal(query.gate, "passed");
  assert.equal(query.maxParams, undefined);
  assert.equal(query.limit, 24);
  assert.equal(query.page, 1);
});

/** Regression: `page` was never read by parseFeedQuery, so ?page=2 rendered page 1. */
test("the feed pagination actually paginates", () => {
  assert.equal(parseFeedQuery({ page: "2" }).page, 2);
  assert.equal(parseFeedQuery({ limit: "6", page: "3" }).limit, 6);
});

test("real filters survive the sanitizer", () => {
  const query = parseFeedQuery({
    category: "vision",
    window: "30d",
    sort: "downloads",
    gate: "all",
    runner: "ComfyUI",
    maxParams: "13",
    license: "apache-2.0",
    q: "qwen"
  });

  assert.deepEqual(
    { ...query, gateForced: undefined },
    {
      category: "vision",
      windowDays: 30,
      sort: "downloads",
      gate: "all",
      runner: "ComfyUI",
      maxParams: 13,
      license: "apache-2.0",
      excludeGated: true,
      q: "qwen",
      limit: 24,
      page: 1,
      gateForced: undefined
    }
  );
});

test("the quality gate is forced back on outside a <=30d, category-scoped view", () => {
  assert.equal(parseFeedQuery({ gate: "all" }).gate, "passed");
  assert.equal(parseFeedQuery({ gate: "all" }).gateForced, true);
  assert.equal(parseFeedQuery({ gate: "all", category: "video" }).gate, "all");
  assert.equal(parseFeedQuery({ gate: "all", category: "video", window: "90d" }).gate, "passed");
});

test("news filters read the same way", () => {
  const blank = parseNewsQuery({ window: "7d", scope: "news", kind: "", category: "" });
  assert.equal(blank.kind, undefined);
  assert.equal(blank.category, undefined);
  assert.equal(blank.scope, "news");

  const applied = parseNewsQuery({ window: "24h", scope: "all", kind: "paper", category: "vision", page: "2" });
  assert.deepEqual(applied, { windowDays: 1, scope: "all", kind: "paper", category: "vision", limit: 30, page: 2 });

  const junk = parseNewsQuery({ window: "junk", scope: "junk", limit: "-4", page: "abc" });
  assert.deepEqual(junk, { windowDays: 7, scope: "news", category: undefined, kind: undefined, limit: 30, page: 1 });
});

test("cleanSearch keeps repeated params usable and drops the rest", () => {
  assert.deepEqual(cleanSearch({ q: ["qwen", "llama"], empty: "", missing: undefined }), { q: "qwen" });
  assert.deepEqual(cleanSearch({}), {});
});
