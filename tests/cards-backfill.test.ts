import { test } from "node:test";
import assert from "node:assert/strict";
import { backfillCards } from "../src/lib/ingest.ts";
import type { ClassifiedModel } from "../src/lib/model.ts";

/**
 * The card backfill is the only place new network reads were added, so it is
 * pinned here: which rows are read, which are skipped forever, and which are
 * retried on a later run.
 */
class FakeCards {
  readonly calls: string[] = [];
  private readonly cards: Record<string, string | null | Error>;

  constructor(cards: Record<string, string | null | Error>) {
    this.cards = cards;
  }

  async getModelCard(id: string): Promise<string | null> {
    this.calls.push(id);
    const value = this.cards[id];
    if (value instanceof Error) throw value;
    return value ?? null;
  }
}

function model(name: string, overrides: Partial<ClassifiedModel> = {}): ClassifiedModel {
  return {
    externalId: name,
    slug: name.replace(/[^A-Za-z0-9._-]/g, "-"),
    name,
    author: null,
    primaryCategory: "coding",
    categories: ["coding"],
    pipelineTag: null,
    libraryName: null,
    license: null,
    licenseName: null,
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "",
    firstSeenAt: "2026-10-14T15:43:17.431Z",
    downloads: 0,
    likes: 0,
    trendingScore: null,
    gated: false,
    qualityPassed: true,
    gateReason: "likes",
    paramsTotal: null,
    paramDtypes: null,
    storageBytes: null,
    quantizations: [],
    runners: [],
    vramEstGb: null,
    sampleImages: [],
    spaces: [],
    url: `https://huggingface.co/${name}`,
    ...overrides
  };
}

const CARD = `---\nlicense: apache-2.0\n---\n\n# Model\n\nA 27B coding model quantised to GGUF for local inference.\n`;

test("only gate-passing models without a stored card are read", async () => {
  const popular = model("owner/popular", { likes: 10 });
  const rejected = model("owner/rejected", { qualityPassed: false });
  const gated = model("owner/gated", { gated: true });
  const already = model("owner/already", { cardSummary: "stored excerpt" });
  const cards = new FakeCards({ [popular.externalId]: CARD });

  const filled = await backfillCards(cards, [popular, rejected, gated, already], 10);

  assert.deepEqual(cards.calls, [popular.externalId]);
  assert.equal(filled, 1);
  assert.ok(popular.cardSummary?.startsWith("A 27B coding model"));
});

test("the budget limit counts models, not rows scanned", async () => {
  const models = [model("a/one", { likes: 30 }), model("a/two", { likes: 20 }), model("a/three", { likes: 10 })];
  const cards = new FakeCards({ "a/one": CARD, "a/two": CARD, "a/three": CARD });

  await backfillCards(cards, models, 2);

  assert.deepEqual(cards.calls, ["a/one", "a/two"], "the most-liked pages fill first");
  assert.equal(models[2].cardSummary, undefined);
});

test("an empty card is stored as null so it is never read twice", async () => {
  const empty = model("a/empty");
  const cards = new FakeCards({ [empty.externalId]: null });

  assert.equal(await backfillCards(cards, [empty], 5), 0);
  assert.equal(empty.cardSummary, null);
  await backfillCards(cards, [empty], 5);
  assert.deepEqual(cards.calls, [empty.externalId], "a second run must not spend a request on an empty card");
});

test("a hard failure leaves the row unknown so a later run retries it", async () => {
  const flaky = model("a/flaky");
  const cards = new FakeCards({ [flaky.externalId]: new Error("HTTP 500") });

  assert.equal(await backfillCards(cards, [flaky], 5), 0);
  assert.equal(flaky.cardSummary, undefined);
});

test("an exhausted request budget stops the pass instead of failing the run", async () => {
  const first = model("a/first");
  const second = model("a/second");
  const cards = new FakeCards({
    [first.externalId]: CARD,
    [second.externalId]: new Error("rate limit budget exhausted (400 per 300s)")
  });

  const filled = await backfillCards(cards, [first, second], 5);

  assert.equal(filled, 1);
  assert.equal(second.cardSummary, undefined);
});
