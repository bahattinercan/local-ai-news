/**
 * "Where am I?" check for the desk nav: on every route, exactly one item carries
 * `aria-current`, and that item is the page the reader is standing on.
 *
 * The defect it guards (docs/en/DESIGN-V3.md §0.2.9): `active` was passed by
 * `/c/[category]` alone, and the desk predicate was `desk.key === (active ?? "")`
 * - so an undefined `active` matched the empty key and **All** carried the ink
 * underline on News, Research, Stats, Compare, Glossary and every detail page,
 * while the section links had no state to carry at all. Fifteen items, one of
 * which was always underlined for the wrong reason.
 *
 *   npx tsx scripts/check-nav-current.ts http://localhost:3000
 *
 * No browser and no timing race: the nav is a server component, so the SSR HTML
 * already holds the marks. Exits non-zero on a wrong, missing or doubled mark.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isLocale, type Locale } from "../src/i18n/index.ts";
import { NAV_SHORT } from "../src/lib/classify/nav.ts";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const requested = process.argv[3] ?? "tr";
/* Narrowed to a real locale: a typo on the command line would otherwise read a
   dictionary that does not exist. It falls back to the default the script had. */
const LOCALE: Locale = isLocale(requested) ? requested : "tr";
const dict: Record<string, string> = JSON.parse(
  readFileSync(join(process.cwd(), "src", "i18n", "dictionaries", `${LOCALE}.json`), "utf-8")
);

/** The desk labels are this locale's short forms: the very table the nav prints,
    imported from `src/lib/classify/nav.ts` so the expectation cannot drift back to
    English while the page prints Turkish. */
const DESK_LABEL: Record<string, string> = NAV_SHORT[LOCALE];

type Expectation = {
  path: string;
  /** The label the marked item must carry; `null` with `anyOf` = one of them,
      `null` without = nothing may be marked. */
  label: string | null;
  current?: "page" | "true";
  /** Where the magnifier posts from this route. */
  search?: string;
  /** One of these labels is acceptable (a news item is News *or* Research). */
  anyOf?: string[];
};

/** A page as the check needs it: the status decides whether the body may be read.
    404 is readable on purpose - the dead-end expectation below reads that body to
    see whether the not-found route rendered a nav at all. Every other non-2xx is
    a break: it says nothing about the nav. */
type Page = { status: number; text: string };

async function fetchPage(path: string, allow404 = false): Promise<Page> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok && !(allow404 && response.status === 404)) {
    throw new Error(`${path} → ${response.status}`);
  }
  return { status: response.status, text: await response.text() };
}

/** The nav is the only `<nav>` that carries the search form; slice it out. `null`
    when the document has no desk nav at all - the not-found fallback below. */
function findDeskNav(html: string): string | null {
  const marker = `aria-label="${dict["nav.primary"]}"`;
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const open = html.lastIndexOf("<nav", start);
  const close = html.indexOf("</nav>", start);
  return html.slice(open, close);
}

function deskNav(html: string): string {
  const nav = findDeskNav(html);
  if (nav === null) throw new Error("desk nav not found (aria-label missing)");
  return nav;
}

type Mark = { label: string; current: string; href: string };

function marksOf(nav: string): Mark[] {
  const marks: Mark[] = [];
  const pattern = /<a\b([^>]*aria-current="(page|true)"[^>]*)>([\s\S]*?)<\/a>/g;
  for (const match of nav.matchAll(pattern)) {
    const [, attributes, current, inner] = match;
    /* The count is a `<sup>` inside the anchor; the label is what precedes it. */
    const label = inner
      .split(/<sup/i)[0]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    marks.push({ label, current, href: /href="([^"]*)"/.exec(attributes)?.[1] ?? "" });
  }
  return marks;
}

function searchAction(nav: string): string {
  return /<form\b[^>]*\baction="([^"]*)"/.exec(nav)?.[1] ?? "-";
}

function firstHref(html: string, pattern: RegExp): string {
  const match = pattern.exec(html);
  if (!match) throw new Error(`no link matching ${pattern} on the page`);
  return match[1];
}

async function main(): Promise<void> {
  const home = `/${LOCALE}`;
  /* Real slugs, read from the site itself, so the list cannot go stale. */
  const models = (await fetchPage(`${home}/models`)).text;
  const news = (await fetchPage(`${home}/news`)).text;
  const glossary = (await fetchPage(`${home}/glossary`)).text;
  const modelSlug = firstHref(models, new RegExp(`href="/${LOCALE}/m/([^"]+)"`));
  const newsId = firstHref(news, new RegExp(`href="/${LOCALE}/n/([^"]+)"`));
  const term = firstHref(glossary, new RegExp(`href="/${LOCALE}/glossary/([^"]+)"`));

  const expectations: Expectation[] = [
    { path: home, label: dict["nav.all"], current: "page", search: `${home}/models` },
    { path: `${home}/models`, label: dict["nav.all"], current: "true", search: `${home}/models` },
    { path: `${home}/models?window=30d&gate=all`, label: dict["nav.all"], current: "true", search: `${home}/models` },
    { path: `${home}/news`, label: dict["nav.news"], current: "page", search: `${home}/news` },
    { path: `${home}/research`, label: dict["nav.research"], current: "page", search: `${home}/research` },
    { path: `${home}/stats`, label: dict["nav.stats"], current: "page", search: `${home}/models` },
    { path: `${home}/compare`, label: dict["nav.compare"], current: "page", search: `${home}/models` },
    /* The glossary answers `?q=` itself since GLOSSARY-PLAN G-D4: the magnifier
       must stay on the page it was opened on. */
    { path: `${home}/glossary`, label: dict["nav.glossary"], current: "page", search: `${home}/glossary` },
    { path: `${home}/c/coding`, label: DESK_LABEL.coding, current: "page", search: `${home}/c/coding` },
    { path: `${home}/c/audio?runner=llama.cpp&q=qwen`, label: DESK_LABEL.audio, current: "page", search: `${home}/c/audio` },
    /* A detail page is *inside* its desk/section, not on it: `true`, not `page`. */
    { path: `${home}/m/${modelSlug}`, label: null, current: "true", anyOf: Object.values(DESK_LABEL) },
    { path: `${home}/n/${newsId}`, label: null, current: "true", anyOf: [dict["nav.news"], dict["nav.research"]] },
    { path: `${home}/glossary/${term}`, label: dict["nav.glossary"], current: "true", search: `${home}/glossary` },
    /* A dead end marks nothing: the empty key must not be matched by an undefined
       `active`, or every not-found branch would underline All again. */
    { path: `${home}/m/__no-such-model__`, label: null }
  ];

  /* The one route that must 404. Two shapes pass: with a desk nav in the body,
     nothing may be marked; without one, nothing can be marked. */
  const DEAD_END = `${home}/m/__no-such-model__`;

  const failures: string[] = [];
  for (const expectation of expectations) {
    const deadEnd = expectation.path === DEAD_END;
    let nav: string;
    try {
      const page = await fetchPage(expectation.path, deadEnd);
      if (deadEnd) {
        if (page.status !== 404) {
          throw new Error("dead-end sample resolved; the not-found route must 404");
        }
        /* Today the 404 is Next's access-fallback document: this app has no
           `app/layout.tsx` (the root layout is `app/[locale]/layout.tsx`, a
           top-level dynamic segment), so the not-found UI is replayed to the
           client and the desk nav never reaches the HTML. A document with no nav
           has no marked item, which is exactly what the dead end asserts. */
        const deadEndNav = findDeskNav(page.text);
        if (deadEndNav === null) {
          console.log(
            `${"ok".padEnd(5)}${expectation.path.padEnd(42)}dead end: 404, no nav rendered (global not-found fallback) - nothing marked`
          );
          continue;
        }
        nav = deadEndNav;
      } else {
        nav = deskNav(page.text);
      }
    } catch (error) {
      failures.push(`${expectation.path}: ${(error as Error).message}`);
      console.log(`${expectation.path.padEnd(42)} FETCH FAILED`);
      continue;
    }

    const marks = marksOf(nav);
    const problems: string[] = [];
    const wanted = expectation.label === null && !expectation.anyOf ? 0 : 1;
    if (marks.length !== wanted) problems.push(`${marks.length} marked (want ${wanted === 0 ? "none" : "exactly 1"})`);
    const mark = marks[0];
    if (mark && wanted === 1) {
      if (expectation.label !== null && mark.label !== expectation.label) {
        problems.push(`marked "${mark.label}", want "${expectation.label}"`);
      }
      if (expectation.label === null && expectation.anyOf && !expectation.anyOf.includes(mark.label)) {
        problems.push(`marked "${mark.label}", want one of ${expectation.anyOf.join(" / ")}`);
      }
      if (expectation.current && mark.current !== expectation.current) {
        problems.push(`aria-current="${mark.current}", want "${expectation.current}"`);
      }
    }
    const action = searchAction(nav);
    if (expectation.search && action !== expectation.search) {
      problems.push(`search→${action}, want ${expectation.search}`);
    }

    const status = problems.length === 0 ? "ok" : "FAIL";
    console.log(
      `${status.padEnd(5)}${expectation.path.padEnd(42)} [${marks.map((m) => `${m.label}:${m.current}`).join(", ") || "none"}]  search→${action}`
    );
    for (const problem of problems) failures.push(`${expectation.path}: ${problem}`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} problem(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`${expectations.length} routes: each marks this page's own item - or nothing, on a dead end.`);
}

main();
