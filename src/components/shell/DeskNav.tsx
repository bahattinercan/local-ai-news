import Link from "next/link";
import { BarChart3, BookOpen, FlaskConical, Newspaper, Scale, Search, type LucideIcon } from "lucide-react";
import { CATEGORY_RULES, categoryLabel } from "@/lib/classify/rules";
import { getCategoryCounts } from "@/lib/store";
import { FEED_DEFAULTS, type FeedFilterInput } from "@/lib/query";
import { cn } from "@/lib/format";
import { ScrollStrip } from "../ui/ScrollStrip";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";

/**
 * The desk nav (docs/en/DESIGN-V3.md §1 zone 5).
 *
 * Taxonomy as *type*, not as pills: letterspaced caps with a superscript count,
 * an ink underline for the active desk, hairlines instead of borders. Pills were
 * 44 px of chrome per row; this is a 44 px row that also states the count.
 *
 * Two things it deliberately keeps from `TabBar`:
 *  - the count is the number of rows the link will actually open, computed from
 *    the reader's current filters, so a desk can never promise more than it shows;
 *  - the active item is passed by the page, because a layout never receives the
 *    route params (`layout.tsx` documents this). That item can be a desk *or* a
 *    section: every non-desk route used to inherit an undefined `active`, and the
 *    nav then underlined **All** on News, Stats, Compare and Glossary alike.
 *
 * The section links (News/Research/Stats/Compare/Glossary) live here on `lg` and
 * in the masthead's disclosure below it, because the masthead replaces its live
 * snapshot block with that disclosure on small screens.
 */
/**
 * The nav's short forms. The taxonomy keeps its full English name everywhere else
 * (`categoryLabel`), because category names are terms rather than UI copy — but a
 * nav row has to fit ten of them plus five sections, and at 1 440 px
 * `EMBEDDING / RAG` was hard-cut mid-word (measured: the strip needed ~1 375 px
 * in a 1 280 px container). These are the same English terms, abbreviated only
 * where the abbreviation is the term everyone actually uses (LLM, RAG's parent
 * category is still "Embedding").
 */
const NAV_SHORT: Record<string, string> = {
  llm: "LLM",
  image: "Image",
  video: "Video",
  coding: "Coding",
  audio: "Audio",
  multimodal: "Multimodal",
  embedding: "Embedding",
  vision: "Vision",
  robotics: "Robotics"
};

/** The five section links, in the order they print; the key is the route segment. */
export type DeskSection = "news" | "research" | "stats" | "compare" | "glossary";

export async function DeskNav({
  locale,
  active,
  section,
  exact = true,
  filters
}: {
  locale: Locale;
  /** The desk the reader is standing in: a category key, or `""` for All. A page
      that passes nothing marks no desk, so a dead end (a model id that does not
      exist) says so instead of underlining All. */
  active?: string;
  /** The section the reader is standing in. A page sets one of `active`/`section`,
      never both; a page that sets neither marks nothing. */
  section?: DeskSection;
  /** `false` on a child page (a model, a news item, a glossary term): the marked
      item is then the *ancestor* the reader came through, so it carries
      `aria-current="true"` — the ARIA value for "current item in a set" — instead
      of claiming to be this exact page. Defaults to `true`, so a flag a page
      forgets can only understate the claim, never overstate it. */
  exact?: boolean;
  filters?: FeedFilterInput;
}) {
  const dict = dictionary(locale);
  const input: FeedFilterInput = filters ?? {
    window: FEED_DEFAULTS.window,
    sort: FEED_DEFAULTS.sort,
    gate: FEED_DEFAULTS.gate
  };
  const { total, counts } = await getCategoryCounts(input);

  const desks = [
    { key: "", label: t(dict, "nav.all"), count: total },
    ...CATEGORY_RULES.filter((rule) => rule.key !== "news").map((rule) => ({
      key: rule.key,
      label: NAV_SHORT[rule.key] ?? categoryLabel(rule.key),
      count: counts.get(rule.key) ?? 0
    }))
  ];

  /* `search` says whether the section's own list can answer `?q=`. News and
     Research are the same `getNews` list under two scopes; Stats and Compare have
     no list to search; the Glossary answers `?q=` itself since GLOSSARY-PLAN G-D4
     (before that, searching from a definition page dumped the reader on the model
     index). */
  const sections: Array<{ key: DeskSection; href: string; label: string; icon: LucideIcon; search: boolean }> = [
    { key: "news", href: hrefFor(locale, "/news"), label: t(dict, "nav.news"), icon: Newspaper, search: true },
    { key: "research", href: hrefFor(locale, "/research"), label: t(dict, "nav.research"), icon: FlaskConical, search: true },
    { key: "stats", href: hrefFor(locale, "/stats"), label: t(dict, "nav.stats"), icon: BarChart3, search: false },
    { key: "compare", href: hrefFor(locale, "/compare"), label: t(dict, "nav.compare"), icon: Scale, search: false },
    { key: "glossary", href: hrefFor(locale, "/glossary"), label: t(dict, "nav.glossary"), icon: BookOpen, search: true }
  ];

  /* Switching desk keeps the reader's filters; without this the destination would
     reset to the default view and every count but the first would be wrong. */
  const params = new URLSearchParams();
  if (input.window !== FEED_DEFAULTS.window) params.set("window", input.window);
  if (input.sort !== FEED_DEFAULTS.sort) params.set("sort", input.sort);
  if (input.gate !== FEED_DEFAULTS.gate) params.set("gate", input.gate);
  if (input.runner) params.set("runner", input.runner);
  if (input.maxParams) params.set("maxParams", String(input.maxParams));
  if (input.license) params.set("license", input.license);
  if (input.q) params.set("q", input.q);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  /* The search form posts to whichever list owns the current desk **or section**, so
     a search from inside a category — or from News — stays inside it. `/models` is
     the full index, and the fallback for the pages that cannot answer `?q=`. */
  const owningSection = sections.find((entry) => entry.key === section && entry.search);
  const searchAction =
    active !== undefined && active !== ""
      ? hrefFor(locale, `/c/${active}`)
      : owningSection
        ? owningSection.href
        : hrefFor(locale, "/models");

  return (
    <nav className="rule-strong rule-bottom mb-5" aria-label={t(dict, "nav.primary")}>
      {/* The desks scroll (they are ten long taxonomy terms), the sections and the
          search do not. Pinning the right-hand controls is what keeps them
          reachable at 1180 px: unfixed, the strip measured ~1 375 px and scrolled
          `NEWS · RESEARCH · STATS · COMPARE · GLOSSARY` completely out of view. */}
      <div className="flex items-stretch gap-3">
        {/* The desks scroll; the right edge fades so a cut term reads as
            "there is more" instead of "the label broke". */}
        <div className="relative min-w-0 flex-1">
          <ScrollStrip label={t(dict, "nav.desks")} className="-mb-px">
            <ul className="flex items-stretch gap-5">
            {desks.map((desk) => {
              /* A desk is marked only when the page passed one: `active` undefined
                 (a section page, a dead end) must not match the empty key and
                 underline All. */
              const isActive = active !== undefined && desk.key === active;
              return (
                <li key={desk.key || "all"} className="flex">
                  <Link
                    href={`${hrefFor(locale, desk.key ? `/c/${desk.key}` : "/")}${suffix}`}
                    aria-current={isActive ? (exact ? "page" : "true") : undefined}
                    className={cn(
                      "label flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pt-px",
                      isActive
                        ? "border-accent text-text"
                        : "border-transparent text-muted hover:border-rule-strong hover:text-text"
                    )}
                  >
                    {desk.label}
                    <sup className={cn("font-mono text-[10px]", isActive ? "text-accent" : "text-muted")}>{desk.count}</sup>
                  </Link>
                </li>
              );
            })}
            </ul>
          </ScrollStrip>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-bg"
          />
        </div>

        {/* Sections: desktop only (below `lg` the masthead disclosure carries them). */}
        <ul className="hidden shrink-0 items-stretch gap-3 lg:flex">
          {sections.map((entry) => {
            const Icon = entry.icon;
            /* Sections used to render with no state at all, so the only thing the
               nav ever marked was a desk — News/Research/Stats/Compare/Glossary
               could never be "where am I" (docs/en/DESIGN-V3.md §0.2.9). */
            const isActive = entry.key === section;
            return (
              <li key={entry.href} className="flex">
                <Link
                  href={entry.href}
                  aria-current={isActive ? (exact ? "page" : "true") : undefined}
                  className={cn(
                    "label flex h-11 items-center gap-1.5 whitespace-nowrap border-b-2 pt-px",
                    isActive
                      ? "border-accent text-text"
                      : "border-transparent text-muted hover:border-rule-strong hover:text-text"
                  )}
                >
                  <Icon size={13} aria-hidden="true" className={isActive ? "text-accent" : undefined} />
                  {entry.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* The reference's search magnifier: a 44 px disclosure, so the control
            costs no width until it is opened. */}
        <details className="relative shrink-0">
          <summary
            className="flex h-11 w-11 cursor-pointer items-center justify-center border-b-2 border-transparent pt-px text-muted hover:text-text"
            aria-label={t(dict, "filters.search")}
          >
            <Search size={14} aria-hidden="true" />
          </summary>
          <form action={searchAction} className="absolute right-0 top-full z-40 mt-1 flex w-72 gap-1 border border-rule-strong bg-surface p-2">
            <label className="sr-only" htmlFor="desk-search">
              {t(dict, "filters.search")}
            </label>
            <input
              id="desk-search"
              name="q"
              type="search"
              defaultValue={input.q ?? ""}
              placeholder={t(dict, "filters.search")}
              className="h-9 min-w-0 flex-1 border border-rule bg-bg px-2 text-sm"
            />
            <button type="submit" className="label h-9 shrink-0 border border-rule-strong bg-text px-3 text-bg">
              {t(dict, "filters.apply")}
            </button>
          </form>
        </details>
      </div>
    </nav>
  );
}
