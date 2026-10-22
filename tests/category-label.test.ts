/**
 * Localized category names (owner decision 2026-10-22, which reverses the
 * 2026-10-15 "category names stay English in every locale" decision recorded in
 * `docs/en/DESIGN.md` §9).
 *
 * What the decision covers, and therefore what is pinned here:
 *
 *  1. The *printed* name follows the reader's locale, through one helper
 *     (`categoryLabel(key, locale)`), so no surface can drift back to a
 *     hand-written `locale === "tr" ? ... : ...`.
 *  2. The *identity* does not move: the key stays the taxonomy term (`coding`,
 *     `llm`) and a key that is not in the table prints itself, so an unknown
 *     category degrades to its slug rather than to an empty label.
 *  3. The English UI must not change at all, including the desk nav's short
 *     forms, whose widths were measured against the 1 280 px container.
 *  4. The Turkish nav row must stay inside the same budget: no form longer than
 *     9 characters (the English row's longest is 10, `Multimodal`), so swapping
 *     the row in cannot widen the strip.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_RULES, categoryLabel } from "../src/lib/classify/rules.ts";
import { NAV_SHORT } from "../src/lib/classify/nav.ts";

/**
 * The desks the nav prints: every category except `news`, which is a section
 * link rather than a desk (`DeskNav` filters it out of the strip).
 */
const DESKS = CATEGORY_RULES.filter((rule) => rule.key !== "news");

/* ------------------------------------------------------- (a) the helper -- */

test("categoryLabel: the printed name follows the locale", () => {
  assert.equal(categoryLabel("coding", "tr"), "Kod");
  assert.equal(categoryLabel("coding", "en"), "Coding");
  assert.equal(categoryLabel("llm", "tr"), "Dil / LLM");
  assert.equal(categoryLabel("llm", "en"), "Language / LLM");
  /* An unknown key is not a category: it prints itself, as before. */
  assert.equal(categoryLabel("does-not-exist", "tr"), "does-not-exist");
  assert.equal(categoryLabel("does-not-exist", "en"), "does-not-exist");
});

/* ------------------------------------- (b) every rule, in both locales -- */

test("categoryLabel: every rule has a non-empty label in both locales", () => {
  assert.equal(CATEGORY_RULES.length, 10);
  for (const rule of CATEGORY_RULES) {
    for (const locale of ["en", "tr"] as const) {
      const label = categoryLabel(rule.key, locale);
      assert.ok(label.trim().length > 0, `${rule.key} / ${locale} printed nothing`);
      /* The helper reads the row, it does not restate it. */
      assert.equal(label, locale === "tr" ? rule.labelTr : rule.labelEn);
    }
  }
});

/* ----------------------- (b2) the two labels that leaked on live /tr -- */

test("categoryLabel: embedding and vision print localized Turkish labels", () => {
  /* Both rows used to print a non-label on /tr: `embedding` was never
     translated (the English "Embedding / RAG" verbatim) and `vision` printed
     "Görü", which is neither a word nor a desk name. `NAV_SHORT.tr` already
     carried the right stems (Gömme, Görme), so the desk labels now match them
     in the same `<stem> / <modifier>` shape as their English counterparts. */
  assert.equal(categoryLabel("embedding", "tr"), "Gömme / RAG");
  assert.equal(categoryLabel("vision", "tr"), "Görme / CV");
  /* The English side is unchanged: same shape, same wording as before. */
  assert.equal(categoryLabel("embedding", "en"), "Embedding / RAG");
  assert.equal(categoryLabel("vision", "en"), "Vision / CV");
});

/* --------------------------------- (c) the Turkish nav row stays narrow -- */

test("nav short forms: every desk has a Turkish form of at most 9 characters", () => {
  /* Pinned so a new category cannot arrive without a nav form and leave the
     strip printing the long desk name. */
  assert.equal(DESKS.length, 9);
  for (const rule of DESKS) {
    const short = NAV_SHORT.tr[rule.key];
    assert.equal(typeof short, "string", `no Turkish nav form for ${rule.key}`);
    assert.ok(short.trim().length > 0, `empty Turkish nav form for ${rule.key}`);
    assert.ok(short.length <= 9, `"${short}" (${rule.key}) is ${short.length} characters`);
  }
});

/* ------------------------------- (d) the English nav row is unchanged -- */

test("nav short forms: the English row is byte-for-byte what it was", () => {
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
  /* And the two rows cover the same desks, so a locale can never fall through to
     the long name on one side only. */
  assert.deepEqual(Object.keys(NAV_SHORT.tr).sort(), Object.keys(NAV_SHORT.en).sort());
});
