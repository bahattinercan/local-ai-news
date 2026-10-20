import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FAMILY_TOKEN_MAX_MODELS,
  buildModelNameIndex,
  familyTokens,
  matchModelInText,
  nameTokens,
  newsForModel,
  newsMentionsModel,
  textHasToken,
  uniqueTokens
} from "../src/lib/model-mentions.ts";
import type { ClassifiedModel } from "../src/lib/model.ts";
import type { SnapshotNews } from "../src/lib/store.ts";

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

function news(externalId: string, title: string, overrides: Partial<SnapshotNews> = {}): SnapshotNews {
  return {
    externalId,
    kind: "release",
    title,
    url: `https://example.com/${externalId}`,
    publishedAt: "2026-10-14T00:00:00.000Z",
    ...overrides
  };
}

/** The repository id that motivated all of this: 108 characters, never in a headline. */
const LONG = model("Qwen3.8-27B-Coder390-EfficientThink-Opus5.5-GPT6Astra-Grok4.7-DSV4Pro-K3-SFT-RLOO-GGUF-NInfer");
const SIBLING = model("Qwen3.8-27B-Coder390-EfficientThink-abliterated-GGUF");
const NINETY_ONE = model("cedar-horizon-91");
const PROMPT_ODE = model("long_rolling_switch_prompt_from_ode_init");

test("name tokens keep version/build identifiers and drop plain words", () => {
  assert.deepEqual(nameTokens(LONG.name), [
    "qwen3.8",
    "coder390",
    "opus5.5",
    "gpt6astra",
    "grok4.7",
    "dsv4pro"
  ]);
  // No digit and shorter than six characters: exactly the words that mismatched.
  assert.deepEqual(nameTokens("cedar-horizon-91"), []);
  assert.deepEqual(nameTokens("long_rolling_switch_prompt_from_ode_init"), []);
});

test("a token only matches as a whole identifier", () => {
  assert.equal(textHasToken("a release about qwen3.5 today", "qwen3.5"), true);
  assert.equal(textHasToken("qwen3.5-coder-32b", "qwen3.5"), true);
  assert.equal(textHasToken("qwen3.55 is out", "qwen3.5"), false);
});

test("family tokens are the rare ones; a token shared across the family is excluded", () => {
  const family = [LONG, SIBLING, model("Qwen3.8-27B-Chat-GGUF"), model("Qwen3.8-4B-Instruct")];
  const index = buildModelNameIndex(family);
  assert.deepEqual(familyTokens(LONG, index), ["coder390", "opus5.5", "gpt6astra", "grok4.7", "dsv4pro"]);
  // Four tracked names carry it, which is above the cap measured for mentions.
  assert.ok(!familyTokens(LONG, index).includes("qwen3.8"));
});

test("ingest tokens are stricter still: only a name that identifies exactly one model", () => {
  const index = buildModelNameIndex([LONG, SIBLING]);
  assert.deepEqual(uniqueTokens(LONG, index), ["opus5.5", "gpt6astra", "grok4.7", "dsv4pro"]);
  assert.ok(!uniqueTokens(SIBLING, index).includes("coder390"));
});

test("the family cap is the measured one", () => {
  assert.equal(FAMILY_TOKEN_MAX_MODELS, 3);
});

test("a news item linked to the model is a mention, whatever its text says", () => {
  const index = buildModelNameIndex([LONG, SIBLING]);
  const item = news("release:1", "a totally unrelated headline", { modelSlug: LONG.slug });
  assert.equal(newsMentionsModel(item, LONG, index), true);
});

test("an item linked to another model is never claimed by a shared token", () => {
  const index = buildModelNameIndex([LONG, SIBLING]);
  const item = news("release:2", `${SIBLING.name} — new coding model`, { modelSlug: SIBLING.slug });
  assert.equal(newsMentionsModel(item, LONG, index), false);
});

test("an unlinked item mentioning a distinctive token is a mention", () => {
  const index = buildModelNameIndex([LONG, SIBLING]);
  const item = news("paper:3", "Notes on Grok4.7 distillation", { kind: "paper" });
  assert.equal(newsMentionsModel(item, LONG, index), true);
});

test("a plain word in the model name matches nothing (the measured false positive)", () => {
  const index = buildModelNameIndex([NINETY_ONE, PROMPT_ODE]);
  const item = news("paper:4", "Horizon: scaling prompt collections for agents", { kind: "paper" });
  assert.equal(newsMentionsModel(item, NINETY_ONE, index), false);
  assert.equal(newsMentionsModel(item, PROMPT_ODE, index), false);
});

test("mentions are newest first and capped", () => {
  const index = buildModelNameIndex([LONG]);
  const items = [
    news("a", "Grok4.7 notes", { publishedAt: "2026-10-01T00:00:00.000Z" }),
    news("b", "More Grok4.7 notes", { publishedAt: "2026-10-10T00:00:00.000Z" }),
    news("c", "Grok4.7 again", { publishedAt: "2026-10-05T00:00:00.000Z" })
  ];
  const rows = newsForModel(LONG, items, index, 2);
  assert.deepEqual(rows.map((row) => row.externalId), ["b", "c"]);
});

test("ingest matcher still links an exact full name", () => {
  const models = [LONG, SIBLING];
  const index = buildModelNameIndex(models);
  assert.equal(matchModelInText(`${SIBLING.name} — new coding model`, models, index)?.slug, SIBLING.slug);
});

test("ingest matcher links a long id through the one token that names it", () => {
  const models = [LONG, SIBLING];
  const index = buildModelNameIndex(models);
  assert.equal(matchModelInText("Grok4.7 finetunes are leaking", models, index)?.slug, LONG.slug);
});

test("ingest matcher refuses a token shared by two models", () => {
  const models = [LONG, SIBLING];
  const index = buildModelNameIndex(models);
  // "coder390" names both rows, so picking one would be a coin flip printed as a fact.
  assert.equal(matchModelInText("Coder390 quantisation notes", models, index), undefined);
});

test("ingest matcher returns nothing when no identifier appears", () => {
  const models = [NINETY_ONE, PROMPT_ODE];
  const index = buildModelNameIndex(models);
  assert.equal(matchModelInText("A new licence for the model hub", models, index), undefined);
});
