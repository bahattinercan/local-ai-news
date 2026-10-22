import { test } from "node:test";
import assert from "node:assert/strict";
import robots from "../src/app/robots.ts";
import {
  ANSWER_ENGINE_CRAWLERS,
  FALLBACK_SITE_URL,
  SEARCH_CRAWLERS,
  SITE_URL,
  TRAINING_CRAWLERS
} from "../src/lib/seo.ts";

/**
 * The crawler policy is a product decision (docs/en/SEO-PLAN.md §14 Q2, v3:
 * "allow search only"), so it is asserted the same way the metadata is: against
 * the route module's own output, not a copy of it. `robots()` is pure, so these
 * tests need no server, no build and no network.
 */
const policy = robots();

interface Rule {
  userAgent?: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
}

function asList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function rules(): Rule[] {
  const value = policy.rules;
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function rulesFor(bot: string): Rule[] {
  return rules().filter((rule) => asList(rule.userAgent).includes(bot));
}

test("the wildcard rule allows the site, disallows /api/ and is not narrowed to a bot", () => {
  const wildcard = rulesFor("*");
  assert.equal(wildcard.length, 1, "exactly one wildcard group");
  assert.deepEqual(asList(wildcard[0].allow), ["/"]);
  assert.ok(asList(wildcard[0].disallow).includes("/api/"), "crawl budget must not go to JSON");

  /* A crawler scoped group wins over `*`, so `*` must not be a list of bots. */
  assert.equal(asList(wildcard[0].userAgent).length, 1);
});

test("every training and fetch crawler is denied the whole site", () => {
  assert.ok(TRAINING_CRAWLERS.length >= 11, "the Q2 deny list covers the eleven named agents");
  for (const bot of TRAINING_CRAWLERS) {
    const matched = rulesFor(bot);
    assert.ok(matched.length > 0, `${bot} needs its own rule: Q2 blocks what it trains on`);
    assert.ok(
      matched.some((rule) => asList(rule.disallow).includes("/")),
      `${bot} must be disallowed / in full`
    );
    /* An equal-length `Allow: /` wins the tie in the major matchers, so a deny
       group that also allows the root is not a deny group at all. */
    assert.equal(
      matched.some((rule) => asList(rule.allow).includes("/")),
      false,
      `${bot} must not carry Allow: / next to Disallow: /`
    );
  }
});

test("no search engine is denied: they stay served by the wildcard rule", () => {
  for (const bot of SEARCH_CRAWLERS) {
    assert.equal(rulesFor(bot).length, 0, `${bot} must inherit the wildcard rule, not get its own`);
  }
  const denied = new Set<string>(TRAINING_CRAWLERS);
  for (const bot of SEARCH_CRAWLERS) {
    assert.equal(denied.has(bot), false, `${bot} must not be on the deny list (§14 Q2)`);
  }
  /* Deny groups, once written, cannot deny an unnamed crawler: no `*` there. */
  for (const rule of rules()) {
    if (!asList(rule.disallow).includes("/")) continue;
    assert.equal(
      asList(rule.userAgent).includes("*"),
      false,
      "a group that disallows / must name its agents, never the wildcard"
    );
  }
});

test("answer engines that cite and link stay allowed (the one Q2 judgement call)", () => {
  for (const bot of ANSWER_ENGINE_CRAWLERS) {
    const matched = rulesFor(bot);
    assert.ok(matched.length > 0, `${bot} gets an explicit allow group so the decision is visible`);
    for (const rule of matched) {
      assert.equal(asList(rule.disallow).includes("/"), false, `${bot} must not be denied the site`);
      assert.deepEqual(asList(rule.allow), ["/"], `${bot} is allowed the whole site`);
    }
    assert.equal(
      (TRAINING_CRAWLERS as readonly string[]).includes(bot),
      false,
      `${bot} must not appear in the deny list: it answers with a citation and a link`
    );
  }
});

test("the sitemap line points at the canonical host", () => {
  assert.equal(policy.sitemap, `${SITE_URL}/sitemap.xml`);
});

test("with NEXT_PUBLIC_SITE_URL unset the canonical host is the Vercel origin", () => {
  /* §14 Q1 (v3): no custom domain will be used. The fallback is the decision. */
  assert.equal(FALLBACK_SITE_URL, "https://local-ai-news.vercel.app");
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  assert.equal(SITE_URL, (fromEnv ?? FALLBACK_SITE_URL).replace(/\/+$/, ""));
  if (fromEnv === undefined || fromEnv === "") {
    assert.equal(SITE_URL, "https://local-ai-news.vercel.app");
    assert.equal(policy.sitemap, "https://local-ai-news.vercel.app/sitemap.xml");
  }
});
