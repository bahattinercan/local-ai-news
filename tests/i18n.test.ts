import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
