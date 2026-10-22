/**
 * OG card tests (docs/en/SEO-PLAN.md §4.4, §16).
 *
 * `ImageResponse` cannot run in a unit test - Satori needs a WASM resvg - so the
 * pixels are never asserted here. What *is* asserted is everything that decides
 * what the pixels say: which strings a card is given for a model, a news item, a
 * glossary term and the site, what it prints when the slug is unknown, and that
 * the committed fonts actually contain the Turkish glyphs a Turkish card needs
 * (a latin-only subset silently renders `ş` as tofu, and the card still "works").
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dictionary } from "../src/i18n/index.ts";
import type { ClassifiedModel } from "../src/lib/model.ts";
import type { SnapshotNews } from "../src/lib/store.ts";
import {
  OG_CONTENT_TYPE,
  OG_HOST,
  OG_SIZE,
  loadOgFonts,
  ogGlossaryCard,
  ogGlossaryCardBySlug,
  ogModelCard,
  ogNewsCard,
  ogSiteCard
} from "../src/lib/og.tsx";

/* ------------------------------------------------------------- fixtures -- */

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
    sampleImages: [],
    spaces: [],
    url: "https://huggingface.co/someone/Cheddar-2.0",
    files: null,
    cardSummary: null,
    cardMeta: null,
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

/* ---------------------------------------------------------------- frame -- */

test("the frame is the size and content type the four routes re-export", () => {
  assert.deepEqual(OG_SIZE, { width: 1200, height: 630 });
  assert.equal(OG_CONTENT_TYPE, "image/png");
  /* The host under the card comes from the same origin the canonicals use. */
  assert.equal(OG_HOST.startsWith("http"), false);
  assert.ok(OG_HOST.length > 0);
});

/* ------------------------------------------------------------ site card -- */

test("the site card prints the nameplate, the tagline, the edition and both counts", () => {
  const card = ogSiteCard({ generatedAt: "2026-10-20T20:42:42Z", tracked: 1402, passed: 529, locale: "en" });
  assert.equal(card.title, "OpenWeight Radar");
  assert.equal(card.deck, dictionary("en")["tagline"]);
  assert.equal(card.kicker, "Snapshot 20 October 2026");
  assert.equal(card.masthead, OG_HOST);
  assert.deepEqual(card.facts, [
    { label: "Tracked", value: "1,402" },
    { label: "Passed", value: "529" }
  ]);
});

test("the site card is translated, including the dateline and the grouping separator", () => {
  const card = ogSiteCard({ generatedAt: "2026-10-20T20:42:42Z", tracked: 1402, passed: 529, locale: "tr" });
  assert.equal(card.deck, dictionary("tr")["tagline"]);
  assert.equal(card.kicker, "Anlık görüntü 20 Ekim 2026");
  assert.equal(card.facts[0].value, "1.402");
});

test("a snapshot-less site card still has a headline and no stray date", () => {
  const card = ogSiteCard({ generatedAt: null, tracked: 0, passed: 0, locale: "en" });
  assert.equal(card.kicker, "");
  assert.equal(card.title, "OpenWeight Radar");
  assert.deepEqual(
    card.facts.map((fact) => fact.value),
    ["0", "0"]
  );
});

/* ----------------------------------------------------------- model card -- */

test("a model card shows the repo name, author, category and the three real specs", () => {
  const card = ogModelCard(model(), "en");
  assert.equal(card.kicker, "MODEL · LLM");
  assert.equal(card.title, "Cheddar-2.0");
  assert.equal(card.deck, "someone");
  assert.deepEqual(card.facts, [
    { label: "params", value: "8.0B" },
    { label: "license", value: "Apache 2.0" },
    { label: "VRAM", value: "~5.2 GB" }
  ]);
});

test("a sparse model card prints only the fields it has, never a placeholder", () => {
  const card = ogModelCard(
    model({ paramsTotal: null, license: null, licenseName: null, vramEstGb: null, quantizations: ["Q4_K_M"] }),
    "en"
  );
  assert.deepEqual(card.facts, [{ label: "Quantizations", value: "Q4_K_M" }]);
  assert.doesNotMatch(JSON.stringify(card), /unknown|null/);
});

test("a model card falls back to the generic nameplate for an unknown slug", () => {
  const card = ogModelCard(null, "en");
  assert.equal(card.title, "OpenWeight Radar");
  assert.equal(card.kicker, "");
  assert.deepEqual(card.facts, []);
  assert.equal(card.masthead, "MODEL");
  assert.equal(card.deck, dictionary("en")["tagline"]);
  /* Rendering a card must never throw on a slug that is not in the snapshot. */
  assert.doesNotThrow(() => ogModelCard(null, "tr"));
});

test("a Turkish model name is truncated at a word boundary, glyphs intact", () => {
  const card = ogModelCard(
    model({
      externalId: "biri/Çok-Uzun-Bir-Model-Adı-ĞŞİıüöç-Sürümü-2026-Ek-Sonek",
      name: "Çok-Uzun-Bir-Model-Adı-ĞŞİıüöç-Sürümü-2026-Ek-Sonek",
      author: "biri"
    }),
    "tr"
  );
  assert.ok(card.title.length <= 44, `title should be truncated, got ${card.title.length}`);
  assert.ok(card.title.endsWith("…"), `expected an ellipsis, got "${card.title}"`);
  /* The ellipsis replaces a whole word, never half of one, and the Turkish
     letters that survived are printed as themselves. */
  const kept = card.title.slice(0, -1);
  assert.ok(kept.includes("Çok"), `expected "Çok" to survive, got "${card.title}"`);
  assert.ok(!/[\uFFFD\u0000]/.test(card.title));
  assert.equal(kept, kept.trimEnd());
  assert.ok(!kept.endsWith("-"));
});

/* ------------------------------------------------------------ news card -- */

test("a news card prints the cleaned headline, the source and the date", () => {
  const card = ogNewsCard(news({ organization: "ggml-org" }), "en");
  assert.equal(card.kicker, "Runtime · 20 October 2026");
  assert.equal(card.title, "llama.cpp b11757: faster local inference");
  assert.equal(card.masthead, "News");
  assert.deepEqual(card.facts, [
    { label: "Source", value: "ggml-org" },
    { label: "Kind", value: "Runtime" }
  ]);
  /* A URL never reaches the card; `newsText` strips it before the title. */
  assert.doesNotMatch(card.title, /https?:\/\//);
});

test("a news card without an organisation falls back to the linked host", () => {
  const card = ogNewsCard(news({ organization: null }), "en");
  assert.deepEqual(card.facts[0], { label: "Source", value: "github.com" });
});

test("a Turkish news headline keeps its glyphs and is cut at a word", () => {
  const card = ogNewsCard(
    news({
      title: "Yeni açık ağırlıklı görüntü modeli ışıltılı sonuçlar üretiyor ve şaşırtıyor",
      summary: "",
      organization: "Hugging Face"
    }),
    "tr"
  );
  assert.ok(card.title.endsWith("…"));
  assert.ok(card.title.length <= 86);
  assert.match(card.title, /[ışğüöçİ]/);
  assert.equal(card.kicker.split(" · ")[0], dictionary("tr")["news.runtime"]);
});

test("a news card falls back to the generic nameplate for an unknown id", () => {
  const card = ogNewsCard(null, "tr");
  assert.equal(card.title, "OpenWeight Radar");
  assert.equal(card.masthead, dictionary("tr")["news.title"]);
  assert.deepEqual(card.facts, []);
  assert.doesNotThrow(() => ogNewsCard(null, "en"));
});

/* -------------------------------------------------------- glossary card -- */

test("a glossary card prints the term, its summary and its category", () => {
  const card = ogGlossaryCardBySlug("gguf", "en");
  assert.equal(card.title, "GGUF");
  assert.equal(card.kicker, "GLOSSARY · File formats");
  assert.equal(card.masthead, "Glossary");
  assert.ok((card.deck ?? "").length > 20);
});

test("a Turkish glossary card uses the Turkish term and summary", () => {
  const card = ogGlossaryCardBySlug("vram", "tr");
  assert.equal(card.masthead, dictionary("tr")["nav.glossary"]);
  assert.equal(card.title, "VRAM");
  assert.match(card.kicker, /^SÖZLÜK · Donanım$/);
  /* The summary is Turkish, so it carries the glyphs a latin-only font drops. */
  assert.match(card.deck ?? "", /[ışğüöçİ]/);
});

test("a glossary card falls back for an unknown term", () => {
  const card = ogGlossaryCardBySlug("does-not-exist", "en");
  assert.equal(card.title, "OpenWeight Radar");
  assert.deepEqual(card.facts, []);
  assert.equal(card.masthead, "Glossary");
  assert.doesNotThrow(() => ogGlossaryCard(null, "tr"));
});

/* ------------------------------------------------------------- the font -- */

/**
 * A minimal `cmap` format-4 reader. Satori does not throw when a glyph is
 * missing - it prints a blank box - so the only way to catch a latin-only
 * "optimisation" of the committed TTF in CI is to read the character map.
 */
function cmapGlyphs(buffer: Buffer): Set<number> {
  const numTables = buffer.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i += 1) {
    const record = 12 + i * 16;
    if (buffer.toString("ascii", record, record + 4) === "cmap") cmap = buffer.readUInt32BE(record + 8);
  }
  assert.ok(cmap >= 0, "font has no cmap table");

  const imported = new Set<number>();
  const subtables = buffer.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i += 1) {
    const record = cmap + 4 + i * 8;
    const platform = buffer.readUInt16BE(record);
    const encoding = buffer.readUInt16BE(record + 2);
    const offset = cmap + buffer.readUInt32BE(record + 4);
    const format = buffer.readUInt16BE(offset);
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (format !== 4 || !unicode) continue;

    const segCount = buffer.readUInt16BE(offset + 6) / 2;
    const endCodes = offset + 14;
    const startCodes = endCodes + segCount * 2 + 2;
    const idDeltas = startCodes + segCount * 2;
    const idRangeOffsets = idDeltas + segCount * 2;

    for (let segment = 0; segment < segCount; segment += 1) {
      const end = buffer.readUInt16BE(endCodes + segment * 2);
      const start = buffer.readUInt16BE(startCodes + segment * 2);
      const delta = buffer.readInt16BE(idDeltas + segment * 2);
      const rangeOffsetAt = idRangeOffsets + segment * 2;
      const rangeOffset = buffer.readUInt16BE(rangeOffsetAt);
      for (let code = start; code <= end && code !== 0xffff; code += 1) {
        let glyph: number;
        if (rangeOffset === 0) {
          glyph = (code + delta) & 0xffff;
        } else {
          const address = rangeOffsetAt + rangeOffset + (code - start) * 2;
          if (address + 1 >= buffer.length) continue;
          glyph = buffer.readUInt16BE(address);
          if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph !== 0) imported.add(code);
      }
    }
  }
  return imported;
}

const TURKISH = "ıİşŞğĞüÜöÖçÇ";

test("every committed card font carries all eleven Turkish letters", () => {
  for (const file of ["SpaceGrotesk-Regular.ttf", "SpaceGrotesk-Bold.ttf", "PlayfairDisplay-Bold.ttf"]) {
    const buffer = readFileSync(new URL(`../public/fonts/${file}`, import.meta.url));
    const glyphs = cmapGlyphs(buffer);
    const missing = [...TURKISH].filter((char) => !glyphs.has(char.codePointAt(0) ?? 0));
    assert.deepEqual(missing, [], `${file} is missing ${missing.join(" ")}`);
    /* A latin-ext-only or latin-only subset would pass a size check and fail here. */
    assert.ok(glyphs.size > 200, `${file} looks subsetted (${glyphs.size} glyphs)`);
  }
});

test("loadOgFonts reads the TTFs from public/fonts, with no network call", async () => {
  const fonts = await loadOgFonts();
  assert.deepEqual(
    fonts.map((font) => [font.name, font.weight]),
    [
      ["Playfair Display", 700],
      ["Space Grotesk", 400],
      ["Space Grotesk", 700]
    ]
  );
  for (const font of fonts) {
    assert.ok(font.data.byteLength > 10_000, `${font.name} ${font.weight} did not load`);
  }
  /* Cached: a second call is the same promise, so a request never re-reads disk. */
  assert.equal(await loadOgFonts(), fonts);
});
