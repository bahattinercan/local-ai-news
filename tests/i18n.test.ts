import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORY_RULES } from "../src/lib/classify/rules.ts";

/**
 * i18n parity, as a test rather than a claim.
 *
 * Every surface takes its strings from the two dictionaries, and decision 4 says
 * TR and EN move together. Until now that was only asserted in the docs (the
 * design plans quote "156 keys in both dictionaries"), so a key added on one side
 * shipped as the raw key name in the other language. The glossary work touched 30
 * keys at once, which is exactly when that happens.
 */
const read = (locale: string): Record<string, string> =>
  JSON.parse(readFileSync(join(process.cwd(), "src", "i18n", "dictionaries", `${locale}.json`), "utf-8")) as Record<
    string,
    string
  >;

const EN = read("en");
const TR = read("tr");

/** The `{name}` placeholders a string interpolates, sorted. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();
}

test("both dictionaries define exactly the same keys", () => {
  const en = Object.keys(EN).sort();
  const tr = Object.keys(TR).sort();
  const missingInTr = en.filter((key) => !(key in TR));
  const missingInEn = tr.filter((key) => !(key in EN));
  assert.deepEqual(missingInTr, [], `missing in tr: ${missingInTr.join(", ")}`);
  assert.deepEqual(missingInEn, [], `missing in en: ${missingInEn.join(", ")}`);
});

test("no string is empty or left as a placeholder key", () => {
  for (const [key, value] of Object.entries(EN)) {
    assert.ok(value.trim().length > 0, `en: ${key} is empty`);
    assert.ok(!value.startsWith(key), `en: ${key} prints its own key name`);
  }
  for (const [key, value] of Object.entries(TR)) {
    assert.ok(value.trim().length > 0, `tr: ${key} is empty`);
    assert.ok(!value.startsWith(key), `tr: ${key} prints its own key name`);
  }
});

test("a translated string interpolates the same placeholders", () => {
  for (const key of Object.keys(EN)) {
    const en = placeholders(EN[key] ?? "");
    const tr = placeholders(TR[key] ?? "");
    assert.deepEqual(tr, en, `${key}: en has {${en.join("},{")}} but tr has {${tr.join("},{")}}`);
  }
});

test("the glossary surface has its strings in both languages", () => {
  /* Spot check rather than a list to maintain: these are the keys the index and
     the entry page cannot render without. */
  for (const key of [
    "glossary.title",
    "glossary.subtitle",
    "glossary.search",
    "glossary.matches",
    "glossary.empty",
    "glossary.emptyHint",
    "glossary.minRead",
    "glossary.evidence",
    "glossary.evidenceCoverage",
    "glossary.explore",
    "glossary.previous",
    "glossary.next"
  ]) {
    assert.ok(key in EN && key in TR, `missing ${key}`);
  }
});

/**
 * The desk copy (docs/en/SEO-PLAN.md §7.3, P2 row "Category intro + FAQ copy in
 * both dictionaries").
 *
 * The page renders `category.<desk>.intro` and three `category.<desk>.faq.*`
 * entries; a desk that loses its copy would quietly render the raw key name, and
 * a Turkish intro that was left as the English one would pass every other parity
 * check here. Word counts are the gate the plan wrote: 150–250 for an intro,
 * 40–90 for an answer.
 */
const DESKS = CATEGORY_RULES.filter((rule) => rule.key !== "news").map((rule) => rule.key);
const FAQ_SLOTS = ["vram", "run", "pick"] as const;
const words = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

function entry(dict: Record<string, string>, key: string): string {
  const value = dict[key];
  assert.equal(typeof value, "string", `missing key ${key}`);
  assert.ok((value ?? "").trim().length > 0, `empty key ${key}`);
  return value as string;
}

test("every desk has a 150–250 word intro in both languages", () => {
  assert.equal(DESKS.length, 9, `expected nine desks, found ${DESKS.length}`);
  for (const desk of DESKS) {
    for (const [locale, dict] of [
      ["en", EN],
      ["tr", TR]
    ] as const) {
      const count = words(entry(dict, `category.${desk}.intro`));
      assert.ok(count >= 150 && count <= 250, `${locale} ${desk}.intro is ${count} words, want 150–250`);
    }
  }
});

test("every desk has exactly three answered FAQs in both languages", () => {
  for (const desk of DESKS) {
    for (const [locale, dict] of [
      ["en", EN],
      ["tr", TR]
    ] as const) {
      const own = Object.keys(dict)
        .filter((key) => key.startsWith(`category.${desk}.faq.`))
        .map((key) => key.slice(`category.${desk}.faq.`.length));
      const questions = [...new Set(own.filter((rest) => rest.endsWith(".q")).map((rest) => rest.slice(0, -2)))];
      assert.deepEqual(questions.sort(), [...FAQ_SLOTS].sort(), `${locale} ${desk}: FAQ slots are ${questions.join(",")}`);

      for (const slot of FAQ_SLOTS) {
        const question = entry(dict, `category.${desk}.faq.${slot}.q`);
        const answer = entry(dict, `category.${desk}.faq.${slot}.a`);
        assert.ok(/\?$/.test(question), `${locale} ${desk}.${slot}.q is not a question: ${question}`);
        const count = words(answer);
        assert.ok(count >= 40 && count <= 90, `${locale} ${desk}.faq.${slot}.a is ${count} words, want 40–90`);
      }
    }
  }
});

test("desk copy interpolates the same figures in both languages", () => {
  /* `t()` substitutes `{name}` per call, so the page must pass one set of figures
     to both locales. A placeholder that exists on one side only prints its braces
     in the other, and a hardcoded number would drift with the snapshot. */
  const keys = DESKS.flatMap((desk) => [
    `category.${desk}.intro`,
    ...FAQ_SLOTS.flatMap((slot) => [`category.${desk}.faq.${slot}.q`, `category.${desk}.faq.${slot}.a`])
  ]);
  for (const key of keys) {
    assert.deepEqual(placeholders(TR[key] ?? ""), placeholders(EN[key] ?? ""), `${key}: placeholder sets differ`);
  }

  /* The intro is the one string that must quote the snapshot, or it is prose that
     an ingest can falsify. */
  for (const desk of DESKS) {
    const intro = placeholders(entry(EN, `category.${desk}.intro`));
    assert.ok(intro.includes("count") && intro.includes("passed"),
      `${desk}.intro must quote {count} and {passed}, found {${intro.join("},")}}`);
  }
});

test("the Turkish desk copy is a translation, not the English text", () => {
  for (const desk of DESKS) {
    assert.notEqual(entry(TR, `category.${desk}.intro`), entry(EN, `category.${desk}.intro`), `${desk}.intro is untranslated`);
    const questions = new Set<string>();
    for (const slot of FAQ_SLOTS) {
      const tr = entry(TR, `category.${desk}.faq.${slot}.a`);
      assert.notEqual(tr, entry(EN, `category.${desk}.faq.${slot}.a`), `${desk}.faq.${slot}.a is untranslated`);
      questions.add(entry(TR, `category.${desk}.faq.${slot}.q`));
    }
    assert.equal(questions.size, 3, `${desk}: the three Turkish questions must differ`);
  }
});
