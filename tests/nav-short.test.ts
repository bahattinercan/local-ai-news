/**
 * The desk nav's short forms (`NAV_SHORT`), pinned where they now live:
 * `src/lib/classify/nav.ts`, because the React component that prints them and
 * `scripts/check-nav-current.ts` that expects them have to read one row, not two
 * (commit a0c404a localized the category names, and the check's own English table
 * started expecting labels the Turkish page no longer prints).
 *
 * What is pinned here:
 *  1. Every desk the nav prints has a short form in both locales, so a new
 *     category cannot arrive and fall through to the long desk name.
 *  2. The Turkish row stays inside the strip's width budget: no form longer than
 *     9 characters (English's longest is 10, `Multimodal`).
 *  3. The English row is byte-for-byte what the nav printed before the names were
 *     localized - the English UI must not change (owner decision 2026-10-22).
 *  4. The Turkish form readers actually say for `coding` is `Kod`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_RULES } from "../src/lib/classify/rules.ts";
import { NAV_SHORT } from "../src/lib/classify/nav.ts";

/**
 * The desks the nav prints: every category except `news`, which is a section link
 * rather than a desk (`DeskNav` filters it out of the strip).
 */
const DESKS = CATEGORY_RULES.filter((rule) => rule.key !== "news");

test("NAV_SHORT: every desk has a non-empty short form in both locales", () => {
  assert.equal(DESKS.length, 9);
  for (const rule of DESKS) {
    for (const locale of ["en", "tr"] as const) {
      const short = NAV_SHORT[locale][rule.key];
      assert.equal(typeof short, "string", `no ${locale} nav form for ${rule.key}`);
      assert.ok(short.trim().length > 0, `empty ${locale} nav form for ${rule.key}`);
    }
  }
  /* Both rows cover the same desks, so a locale can never fall through to the
     long name on one side only. */
  assert.deepEqual(Object.keys(NAV_SHORT.en).sort(), Object.keys(NAV_SHORT.tr).sort());
});

test("NAV_SHORT: the Turkish row stays inside the nav's width budget", () => {
  for (const rule of DESKS) {
    const short = NAV_SHORT.tr[rule.key];
    assert.ok(short.length <= 9, `"${short}" (${rule.key}) is ${short.length} characters`);
  }
});

test("NAV_SHORT: the English row is byte-for-byte what it was", () => {
  assert.deepEqual(NAV_SHORT.en, {
    llm: "LLM",
    image: "Image",
    video: "Video",
    coding: "Coding",
    audio: "Audio",
    multimodal: "Multimodal",
    embedding: "Embedding",
    vision: "Vision",
    robotics: "Robotics"
  });
});

test("NAV_SHORT: the Turkish desk for coding is the word readers say", () => {
  assert.equal(NAV_SHORT.tr.coding, "Kod");
});
