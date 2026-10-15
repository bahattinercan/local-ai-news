import { test } from "node:test";
import assert from "node:assert/strict";
import { GLOSSARY, GLOSSARY_CATEGORIES, getGlossaryEntry, glossaryByCategory, glossaryText } from "../src/lib/glossary.ts";

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
