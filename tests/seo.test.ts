import { test } from "node:test";
import assert from "node:assert/strict";
import type { ClassifiedModel } from "../src/lib/model.ts";
import type { SnapshotNews } from "../src/lib/store.ts";
import {
  canonicalUrl,
  categoryWord,
  isDesk,
  isIndexableModel,
  isIndexableNews,
  languageAlternates,
  listMetadata,
  modelDescription,
  modelTitle,
  newsDescription,
  newsTitle,
  specCount,
  SITE_URL
} from "../src/lib/seo.ts";

function model(overrides: Partial<ClassifiedModel> = {}): ClassifiedModel {
  return {
    externalId: "someone/Cheddar-2.0",
    slug: "someone-Cheddar-2.0",
    name: "Cheddar-2.0",
    author: "someone",
    primaryCategory: "llm",
    categories: ["llm"],
    pipelineTag: "text-generation",
    libraryName: "transformers",
    license: "apache-2.0",
    licenseName: "Apache 2.0",
    createdAt: "2026-10-14T14:38:51.000Z",
    updatedAt: "2026-10-15T10:00:00.000Z",
    firstSeenAt: "2026-10-14T15:43:17.431Z",
    downloads: 1200,
    likes: 12,
    trendingScore: null,
    gated: false,
    qualityPassed: true,
    gateReason: "passed",
    paramsTotal: 8_000_000_000,
    paramDtypes: null,
    storageBytes: 16_000_000_000,
    quantizations: ["Q4_K_M", "Q8_0"],
    runners: ["llama.cpp", "Ollama"],
    vramEstGb: 5.2,
    sampleImages: ["https://example.com/sample.png"],
    spaces: [],
    url: "https://huggingface.co/someone/Cheddar-2.0",
    files: [{ name: "model-Q4_K_M.gguf", bytes: 5_000_000_000 }],
    cardSummary: "A compact local model for testing the SEO builders with enough words to be useful.",
    ...overrides
  };
}

function news(overrides: Partial<SnapshotNews> = {}): SnapshotNews {
  return {
    externalId: "gh_llama_cpp:tag:github.com,2008:Repository/1",
    kind: "runtime",
    title: "llama.cpp b11757: faster local inference",
    summary:
      "The release improves prompt processing and fixes a crash. See https://github.com/ggml-org/llama.cpp/releases/tag/b11757 for the full changelog.",
    url: "https://github.com/ggml-org/llama.cpp/releases/tag/b11757",
    publishedAt: "2026-10-20T08:00:00.000Z",
    ...overrides
  };
}

test("canonicalUrl uses the site origin, the locale and no double slash", () => {
  assert.equal(canonicalUrl("en", "/m/someone-Cheddar-2.0"), `${SITE_URL}/en/m/someone-Cheddar-2.0`);
  assert.equal(canonicalUrl("tr", "/c/llm"), `${SITE_URL}/tr/c/llm`);
  assert.equal(canonicalUrl("en", "/"), `${SITE_URL}/en`);
});

test("every alternate is absolute and x-default points at EN", () => {
  const languages = languageAlternates("/glossary/gguf");
  assert.equal(languages.en, `${SITE_URL}/en/glossary/gguf`);
  assert.equal(languages.tr, `${SITE_URL}/tr/glossary/gguf`);
  assert.equal(languages["x-default"], languages.en);
  assert.equal(languageAlternates("/models", "page=2").tr, `${SITE_URL}/tr/models?page=2`);
});

test("specCount counts reported fields, not keys", () => {
  assert.equal(specCount(model()), 8);
  assert.equal(
    specCount(model({ paramsTotal: null, license: null, storageBytes: null, vramEstGb: null, files: [], quantizations: [], runners: [], libraryName: null })),
    0
  );
});

test("a gate-passed model needs four specs or 200 characters of prose to be indexed", () => {
  assert.equal(isIndexableModel(model()), true);
  assert.equal(
    isIndexableModel(
      model({
        paramsTotal: null,
        license: null,
        storageBytes: null,
        vramEstGb: null,
        files: [],
        quantizations: [],
        runners: [],
        libraryName: null,
        cardSummary: null
      })
    ),
    false
  );
  assert.equal(
    isIndexableModel(
      model({
        paramsTotal: null,
        license: null,
        storageBytes: null,
        vramEstGb: null,
        files: [],
        quantizations: [],
        runners: [],
        libraryName: null,
        cardSummary: "x".repeat(200)
      })
    ),
    true
  );
  /* §14 Q5 changed the gate-failed half of this predicate: six or more specs now
     index regardless of `qualityPassed`, so a thin gate-failed row is the case
     that still has to stay out. */
  assert.equal(
    isIndexableModel(model({ qualityPassed: false, ...specFields({ of: 3 }) })),
    false
  );
});

/**
 * A model reporting exactly `of` of the eight spec fields and no card prose, so
 * a where-clause in the predicate tests reads as one number instead of eight
 * hand-written `null`s that silently drift when `SPEC_KEYS` changes.
 */
function specFields(input: { of: number }): Partial<ClassifiedModel> {
  const fieldNames = [
    "paramsTotal",
    "license",
    "libraryName",
    "storageBytes",
    "vramEstGb",
    "files",
    "quantizations",
    "runners"
  ] as const;
  const filled: Record<(typeof fieldNames)[number], unknown> = {
    paramsTotal: 8_000_000_000,
    license: "apache-2.0",
    libraryName: "transformers",
    storageBytes: 16_000_000_000,
    vramEstGb: 5.2,
    files: [{ name: "model-Q4_K_M.gguf", bytes: 5_000_000_000 }],
    quantizations: ["Q4_K_M"],
    runners: ["llama.cpp"]
  };
  const empty: Record<(typeof fieldNames)[number], unknown> = {
    paramsTotal: null,
    license: null,
    libraryName: null,
    storageBytes: null,
    vramEstGb: null,
    files: [],
    quantizations: [],
    runners: []
  };
  const fields: Record<string, unknown> = { cardSummary: null };
  fieldNames.forEach((name, index) => {
    fields[name] = index < input.of ? filled[name] : empty[name];
  });
  return fields as Partial<ClassifiedModel>;
}

test("a model with six or more reported specs is indexable even when the gate failed (§14 Q5)", () => {
  assert.equal(isIndexableModel(model({ qualityPassed: false, cardSummary: null, ...specFields({ of: 6 }) })), true);
  assert.equal(
    isIndexableModel(model({ qualityPassed: false, cardSummary: "x".repeat(240), ...specFields({ of: 6 }) })),
    true,
    "a long summary on top of six specs must not change the answer"
  );
  assert.equal(
    isIndexableModel(model({ qualityPassed: false, cardSummary: null, ...specFields({ of: 5 }) })),
    false,
    "five specs and no prose is still a thin gate-failed page"
  );
  assert.equal(
    isIndexableModel(model({ qualityPassed: true, cardSummary: null, ...specFields({ of: 4 }) })),
    true,
    "the gate-passed four-spec floor is unchanged"
  );
  assert.equal(specCount(model({ cardSummary: null, ...specFields({ of: 6 }) })), 6, "the fixture reports six fields");
});

test("news indexability protects against stub papers but keeps releases", () => {
  assert.equal(isIndexableNews(news()), true);
  assert.equal(isIndexableNews(news({ kind: "paper", summary: "short" })), false);
  assert.equal(isIndexableNews(news({ kind: "paper", summary: "x".repeat(300) })), true);
});

test("the model title names the repo, the size and the category, and never cuts mid-word", () => {
  const title = modelTitle(model());
  assert.match(title, /someone\/Cheddar-2\.0/);
  assert.match(title, /8\.0B/);
  assert.match(title, /local LLM model/);
  assert.ok(title.length <= 80, title);
  assert.equal(modelTitle(model({ paramsTotal: null })).includes("null"), false);
  assert.match(modelTitle(model(), "tr"), /yerel LLM modeli/);

  const long = (suffix: string) =>
    modelTitle(model({ externalId: `owner/${"a".repeat(70)}-${suffix}-GGUF` }));
  assert.notEqual(long("NanoPlus"), long("MiniPlus"));
});

test("the model description is built from facts that exist and never prints null", () => {
  const description = modelDescription(model(), "en");
  assert.match(description, /someone\/Cheddar-2\.0/);
  assert.match(description, /8\.0B/);
  assert.match(description, /Q4_K_M/);
  assert.match(description, /llama\.cpp/);
  assert.match(description, /License: Apache 2\.0/);
  assert.equal(description.includes("null"), false);
  assert.equal(description.includes("undefined"), false);

  const bare = modelDescription(
    model({
      paramsTotal: null,
      quantizations: [],
      runners: [],
      vramEstGb: null,
      license: null,
      licenseName: null,
      cardSummary: null
    }),
    "tr"
  );
  assert.match(bare, /Cheddar-2\.0/);
  assert.match(bare, /modeli/);
  assert.equal(bare.includes("null"), false);
});

test("news title and description are cleaned, never the external URL", () => {
  const title = newsTitle(news());
  assert.match(title, /llama\.cpp b11757/);
  assert.equal(title.includes("https://"), false);

  const description = newsDescription(news(), "en");
  assert.equal(description.includes("https://"), false);
  assert.match(description, /prompt processing/);
  assert.ok(description.length <= 161, description);
});

test("listMetadata indexes the bare route and page 2, and noindexes filters", () => {
  const bare = listMetadata("en", { path: "/models", raw: {} });
  assert.equal(bare.alternates.canonical, `${SITE_URL}/en/models`);
  assert.equal(bare.robots, undefined);
  assert.equal(bare.alternates.languages?.tr, `${SITE_URL}/tr/models`);

  const page2 = listMetadata("en", { path: "/models", raw: { page: "2" } });
  assert.equal(page2.alternates.canonical, `${SITE_URL}/en/models?page=2`);
  assert.equal(page2.robots, undefined);

  const filtered = listMetadata("en", { path: "/models", raw: { runner: "ollama", page: "2" } });
  assert.equal(filtered.alternates.canonical, `${SITE_URL}/en/models`);
  assert.deepEqual(filtered.robots, { index: false, follow: true });
  assert.equal(filtered.alternates.languages, undefined);
});

test("news pagination stays out of the index; the bare list does not", () => {
  const bare = listMetadata("en", { path: "/news", raw: {}, filterKeys: ["window", "kind"], pageIsIndexable: false });
  assert.equal(bare.robots, undefined);

  const page2 = listMetadata("en", { path: "/news", raw: { page: "2" }, filterKeys: ["window", "kind"], pageIsIndexable: false });
  assert.deepEqual(page2.robots, { index: false, follow: true });
  assert.equal(page2.alternates.canonical, `${SITE_URL}/en/news`);
});

test("only the nine real desks are routes; news is not a category page", () => {
  assert.equal(isDesk("llm"), true);
  assert.equal(isDesk("coding"), true);
  assert.equal(isDesk("news"), false);
  assert.equal(isDesk("nonsense"), false);
  assert.equal(categoryWord("coding", "tr"), "kod");
  assert.equal(categoryWord("llm", "tr"), "LLM");
});
