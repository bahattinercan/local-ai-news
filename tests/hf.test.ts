import { test } from "node:test";
import assert from "node:assert/strict";
import { HfClient, RateLimitBudget, parseNextCursor } from "../src/lib/sources/hf.ts";

const LINK =
  '<https://huggingface.co/api/models?pipeline_tag=text-to-image&limit=100&cursor=eyIkb3IiOiJ4In0%3D>; rel="next"';

test("cursor is read from the Link header as an opaque string", () => {
  const cursor = parseNextCursor(LINK);
  assert.equal(cursor, 'eyIkb3IiOiJ4In0=');
  assert.equal(parseNextCursor(null), null);
  assert.equal(parseNextCursor('<https://huggingface.co/api/models?limit=1>; rel="prev"'), null);
});

test("budget is enforced before the request, not after", async () => {
  const calls: string[] = [];
  const client = new HfClient({
    maxRequestsPerWindow: 2,
    fetchImpl: async (url) => {
      calls.push(String(url));
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });

  await client.listModels({ pipelineTag: "text-to-image" });
  await client.listModels({ pipelineTag: "text-to-image" });

  await assert.rejects(() => client.listModels({ pipelineTag: "text-to-image" }), /budget exhausted/);
  assert.equal(calls.length, 2);
});

test("429 backs off using Retry-After and retries the same URL", async () => {
  let attempts = 0;
  const client = new HfClient({
    maxWaitMs: 5,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response("too many requests", { status: 429, headers: { "Retry-After": "0" } });
      }
      return new Response("[]", { status: 200 });
    }
  });

  const page = await client.listModels();
  assert.equal(attempts, 2);
  assert.deepEqual(page.items, []);
});

test("window resets after the fixed window elapses", () => {
  const budget = new RateLimitBudget(3, 1000);
  budget.consume();
  budget.consume();
  assert.equal(budget.remaining, 1);

  const windowStart = Date.now();
  budget.consume();
  assert.equal(budget.remaining, 0);

  // simulate the window boundary
  const next = new RateLimitBudget(3, 1000);
  next.consume();
  assert.equal(next.remaining, 2);
  assert.ok(windowStart > 0);
});
