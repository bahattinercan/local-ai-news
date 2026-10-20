import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  bodySegments,
  fold,
  getGlossaryEntry,
  glossaryByCategory,
  glossarySorted,
  glossaryText,
  readingMinutes,
  refSlugs,
  searchGlossary
} from "../src/lib/glossary.ts";
import { estimateVramGb } from "../src/lib/runner/vram.ts";

test("every entry is complete in both languages", () => {
  for (const entry of GLOSSARY) {
    for (const locale of ["en", "tr"] as const) {
      const text = glossaryText(entry, locale);
      assert.ok(text.term.trim().length > 0, `${entry.slug}/${locale}: empty term`);
      assert.ok(text.summary.trim().length > 20, `${entry.slug}/${locale}: summary is a stub`);
      assert.ok(text.body.length >= 2, `${entry.slug}/${locale}: fewer than two paragraphs`);
      for (const paragraph of text.body) {
        assert.ok(paragraph.trim().length > 80, `${entry.slug}/${locale}: paragraph is a stub`);
      }
    }
  }
});

test("slugs are unique and url-safe", () => {
  const slugs = GLOSSARY.map((entry) => entry.slug);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate slug");
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9-]+$/, `slug is not url-safe: ${slug}`);
  }
});

test("every related slug resolves and no entry links to itself", () => {
  for (const entry of GLOSSARY) {
    for (const related of entry.related) {
      assert.ok(getGlossaryEntry(related), `${entry.slug} links to missing entry ${related}`);
      assert.notEqual(related, entry.slug, `${entry.slug} links to itself`);
    }
  }
});

test("every entry sits in a known category and every category is reachable", () => {
  const known = new Set(Object.keys(GLOSSARY_CATEGORIES));
  for (const entry of GLOSSARY) {
    assert.ok(known.has(entry.category), `${entry.slug}: unknown category ${entry.category}`);
  }
  const used = new Set(glossaryByCategory().map((group) => group.category));
  for (const category of known) {
    assert.ok(used.has(category as never), `category ${category} has no entries`);
  }
});

test("glossaryText never falls back to the other language", () => {
  // VRAM and GGUF are the same word in both languages, so compare whole objects
  // for one entry whose text does differ.
  const quantization = getGlossaryEntry("quantization");
  assert.ok(quantization);
  assert.equal(glossaryText(quantization, "en").term, "Quantization");
  assert.equal(glossaryText(quantization, "tr").term, "Kuantizasyon");
  assert.notDeepEqual(glossaryText(quantization, "en").body, glossaryText(quantization, "tr").body);
});

test("the entries the model page links to exist", () => {
  // Keeps the contextual links in app/[locale]/m/[slug]/page.tsx from rotting.
  for (const slug of ["params", "quantization", "vram"]) {
    assert.ok(getGlossaryEntry(slug), `the model page links to a missing entry: ${slug}`);
  }
});

/* --- G0: search, ordering, reading cost (docs/en/GLOSSARY-PLAN.md) --- */

test("fold is Turkish-aware: dotted and dotless i land in the same bucket", () => {
  assert.equal(fold("İLK", "tr"), fold("ilk", "tr"));
  assert.equal(fold("IŞIK", "tr"), fold("isik", "tr"));
  assert.equal(fold("Bağlam", "tr"), "baglam");
  assert.equal(fold("Kuantizasyon", "tr"), fold("KUANTİZASYON", "tr"));
});

test("search finds a term by its own name in both languages", () => {
  assert.equal(searchGlossary("kuantizasyon", "tr")[0]?.entry.slug, "quantization");
  assert.equal(searchGlossary("quantization", "en")[0]?.entry.slug, "quantization");
});

test("search ignores Turkish diacritics and case", () => {
  const slugs = searchGlossary("baglam", "tr").map((match) => match.entry.slug);
  assert.ok(slugs.includes("context-window"), `expected context-window, got ${slugs.join(",")}`);
});

test("search reaches aliases and body text, and every token must match", () => {
  const byAlias = searchGlossary("video memory", "en").map((match) => match.entry.slug);
  assert.ok(byAlias.includes("vram"), "alias 'video memory' should reach vram");

  const byBody = searchGlossary("kv cache", "en").map((match) => match.entry.slug);
  assert.ok(byBody.includes("vram"), "body mention of KV cache should reach vram");

  assert.equal(searchGlossary("gguf zzzz", "en").length, 0, "an unmatched token must drop the entry");
});

test("an empty query returns every entry in collation order", () => {
  const all = searchGlossary("  ", "en");
  assert.equal(all.length, GLOSSARY.length);
  assert.deepEqual(all.map((match) => match.entry.slug), glossarySorted("en").map((entry) => entry.slug));
});

test("ordering follows the Turkish alphabet, not UTF-16", () => {
  const slugs = glossarySorted("tr").map((entry) => entry.slug);
  assert.ok(slugs.indexOf("quality-gate") < slugs.indexOf("quantization"), "Kalite < Kuantizasyon in Turkish");
  assert.ok(slugs.indexOf("safetensors") < slugs.indexOf("moe"), "Safetensors < Uzman karışımı");
});

test("reading time is never zero and grows with the body", () => {
  for (const entry of GLOSSARY) {
    for (const locale of ["en", "tr"] as const) {
      assert.ok(readingMinutes(entry, locale) >= 1, `${entry.slug}/${locale}: 0 minutes`);
    }
  }
});

test("every body cross-reference resolves in both languages", () => {
  for (const entry of GLOSSARY) {
    for (const locale of ["en", "tr"] as const) {
      for (const slug of refSlugs(entry, locale)) {
        assert.ok(getGlossaryEntry(slug), `${entry.slug}/${locale}: dangling ref {${slug}}`);
      }
      for (const paragraph of glossaryText(entry, locale).body) {
        for (const segment of bodySegments(paragraph)) {
          assert.ok(!(segment.kind === "text" && /\{[a-z0-9-]+\}/.test(segment.text)), `${entry.slug}/${locale}: unresolved ref left in text`);
        }
      }
    }
  }
});

test("entry metadata points at things that exist", () => {
  const widgets = new Set(["quantization-table", "vram-calculator"]);
  for (const entry of GLOSSARY) {
    if (entry.widget) assert.ok(widgets.has(entry.widget), `${entry.slug}: unknown widget ${entry.widget}`);
    for (const locale of ["en", "tr"] as const) {
      for (const alias of entry.aliases?.[locale] ?? []) {
        assert.ok(alias.trim().length > 0, `${entry.slug}/${locale}: empty alias`);
      }
    }
    for (const explore of entry.explore ?? []) {
      assert.match(explore.query, /^\/models\?/, `${entry.slug}: explore query must be a /models filter`);
      assert.ok(explore.label.en.length > 3 && explore.label.tr.length > 3, `${entry.slug}: explore label is a stub`);
    }
  }
});

test("vram worked examples are computable, not quoted", () => {
  const vram = getGlossaryEntry("vram");
  assert.ok(vram?.examples?.length, "vram entry should declare examples");
  for (const example of vram.examples ?? []) {
    const estimate = estimateVramGb(example.params, example.quantization, example.context);
    assert.ok(estimate && estimate > 0, "estimate must be a positive number");
  }
});

test("a quoted term sorts under its first letter, not under the quote", () => {
  assert.notEqual(glossarySorted("en")[0]?.slug, "first-seen", "“New” must not lead the index");
  assert.equal(glossarySorted("tr")[0]?.slug, "context-window", "Bağlam penceresi is the first Turkish term");
  const english = glossarySorted("en").map((entry) => entry.slug);
  assert.ok(english.indexOf("first-seen") > english.indexOf("lora"), "“New” belongs after LoRA");
});
