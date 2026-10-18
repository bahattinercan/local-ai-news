import Link from "next/link";
import { BarChart3, BookOpen, FlaskConical, Newspaper, Scale, Search } from "lucide-react";
import { CATEGORY_RULES, categoryLabel } from "@/lib/classify/rules";
import { getCategoryCounts } from "@/lib/store";
import { FEED_DEFAULTS, type FeedFilterInput } from "@/lib/query";
import { cn } from "@/lib/format";
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
 *  - the active desk is passed by the page, because a layout never receives the
 *    route params (`layout.tsx` documents this).
 *
 * The section links (News/Research/Stats/Compare/Glossary) live here on `lg` and
 * in the masthead's disclosure below it, because the masthead replaces its live
 * snapshot block with that disclosure on small screens.
 */
export async function DeskNav({
  locale,
  active,
  filters
}: {
  locale: Locale;
  active?: string;
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
      label: categoryLabel(rule.key),
      count: counts.get(rule.key) ?? 0
    }))
  ];

  const sections = [
    { href: hrefFor(locale, "/news"), label: t(dict, "nav.news"), icon: Newspaper },
    { href: hrefFor(locale, "/research"), label: t(dict, "nav.research"), icon: FlaskConical },
    { href: hrefFor(locale, "/stats"), label: t(dict, "nav.stats"), icon: BarChart3 },
    { href: hrefFor(locale, "/compare"), label: t(dict, "nav.compare"), icon: Scale },
    { href: hrefFor(locale, "/glossary"), label: t(dict, "nav.glossary"), icon: BookOpen }
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

  /* The search form posts to whichever list owns the current desk, so a search
     from inside a category stays inside it. `/models` is the full index. */
  const searchAction = active ? hrefFor(locale, `/c/${active}`) : hrefFor(locale, "/models");

  return (
    <nav className="rule-strong rule-bottom mb-5" aria-label={t(dict, "nav.primary")}>
      {/* The desks scroll (they are ten long taxonomy terms), the sections and the
          search do not. Pinning the right-hand controls is what keeps them
          reachable at 1180 px: unfixed, the strip measured ~1 375 px and scrolled
          `NEWS · RESEARCH · STATS · COMPARE · GLOSSARY` completely out of view. */}
      <div className="flex items-stretch gap-3">
        <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
          <ul className="flex items-stretch gap-5">
            {desks.map((desk) => {
              const isActive = desk.key === (active ?? "");
              return (
                <li key={desk.key || "all"} className="flex">
                  <Link
                    href={`${hrefFor(locale, desk.key ? `/c/${desk.key}` : "/")}${suffix}`}
                    aria-current={isActive ? "page" : undefined}
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
        </div>

        {/* Sections: desktop only (below `lg` the masthead disclosure carries them). */}
        <ul className="hidden shrink-0 items-stretch gap-3 lg:flex">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <li key={section.href} className="flex">
                <Link
                  href={section.href}
                  className="label flex h-11 items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent pt-px text-muted hover:border-rule-strong hover:text-text"
                >
                  <Icon size={13} aria-hidden="true" />
                  {section.label}
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
