import { z } from "zod";

export const WINDOWS = ["24h", "7d", "30d", "90d"] as const;
export const SORTS = ["new", "trending", "downloads", "likes"] as const;

/**
 * The feed's zero-config view. The tab counts read this so the number printed on
 * a tab can never drift from the number of cards the tab actually opens.
 */
export const FEED_DEFAULTS = { window: "7d", sort: "new", gate: "passed" } as const;

/**
 * A GET form submits *every* named control, so an untouched select or an empty
 * search box arrives as `""` - and `?runner=` typed by hand does the same.
 * Zod's `.min(1)` / `.enum()` reject those, and before this sanitizer existed
 * every "Apply" click that left one field blank threw out of the page render
 * (HTTP 500 instead of a filtered feed). Blank means "not set", so drop it.
 */
export function cleanSearch(search: Record<string, string | string[] | undefined>) {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (typeof single !== "string") continue;
    const trimmed = single.trim();
    if (trimmed !== "") cleaned[key] = trimmed;
  }
  return cleaned;
}

/**
 * Every field degrades to its default instead of throwing: a hand-edited URL
 * (`?window=abc&limit=999`) must not take the page down, and the API routes
 * share these parsers.
 */
export const feedQuerySchema = z.object({
  category: z.string().min(1).optional(),
  window: z.enum(WINDOWS).catch(FEED_DEFAULTS.window),
  sort: z.enum(SORTS).catch(FEED_DEFAULTS.sort),
  gate: z.enum(["passed", "all"]).catch(FEED_DEFAULTS.gate),
  runner: z.string().min(1).optional(),
  maxParams: z.coerce.number().positive().optional().catch(undefined),
  license: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).catch(24),
  page: z.coerce.number().int().positive().catch(1)
});

export type FeedQueryInput = z.infer<typeof feedQuerySchema>;

export function windowDays(window: FeedQueryInput["window"]): number {
  if (window === "24h") return 1;
  return Number(window.replace("d", ""));
}

/**
 * Decision 9: "Show everything" is only allowed inside a 30-day window, otherwise
 * the result set explodes.
 *
 * `aggregate` is the one documented relaxation (docs/en/STATS-PLAN.md S3): an
 * aggregate surface (the Data Desk) prints at most nine rows, so it has nothing
 * to explode and may show the whole tracked set inside the same 30-day limit
 * without selecting a category. The feed never passes it, so its behaviour is
 * unchanged.
 */
export function normalizeFeedQuery(
  input: FeedQueryInput,
  options: { aggregate?: boolean } = {}
) {
  const days = windowDays(input.window);
  const gate = input.gate === "all" && (days > 30 || (!input.category && !options.aggregate)) ? "passed" : input.gate;

  return {
    category: input.category,
    windowDays: days,
    sort: input.sort,
    gate,
    runner: input.runner,
    maxParams: input.maxParams,
    license: input.license,
    excludeGated: true,
    q: input.q,
    limit: input.limit,
    page: input.page,
    gateForced: input.gate === "all" && gate === "passed"
  };
}

/** Total pages for a result count, never less than 1. */
export function pageCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, limit)));
}

/**
 * A page number that actually exists. `?page=999` used to render an empty list
 * headed "Sayfa 999", with a "previous" link to page 998 and no active number in
 * the strip, because nothing clamped the parsed page against the result count.
 */
export function clampPage(page: number, total: number, limit: number): number {
  return Math.min(Math.max(1, page), pageCount(total, limit));
}

/** What a query nobody asked for means; also the last-resort fallback below. */
const EMPTY_FEED_QUERY: FeedQueryInput = { ...FEED_DEFAULTS, limit: 24, page: 1 };

export function parseFeedQuery(search: Record<string, string | string[] | undefined>) {
  // `page` used to be missing here, so ?page=2 silently rendered page 1 and the
  // numbered pagination links were dead ends.
  const parsed = feedQuerySchema.safeParse(cleanSearch(search));
  return normalizeFeedQuery(parsed.success ? parsed.data : EMPTY_FEED_QUERY);
}

/** The filter state as a query *input* - what the tab bar counts and links from. */
export type FeedFilterInput = Pick<FeedQueryInput, "window" | "sort" | "gate" | "runner" | "maxParams" | "license" | "q">;

/**
 * Reverses `normalizeFeedQuery` for the tab bar. The counts and the links have
 * to describe the same filters the list is rendering, so `gate: "all"` is kept
 * when the reader asked for it even if the current page dialled it back.
 */
export function feedFiltersOf(query: ReturnType<typeof normalizeFeedQuery>): FeedFilterInput {
  return {
    window: query.windowDays === 1 ? "24h" : (`${query.windowDays}d` as FeedFilterInput["window"]),
    sort: query.sort,
    gate: query.gateForced ? "all" : query.gate,
    runner: query.runner,
    maxParams: query.maxParams,
    license: query.license,
    q: query.q
  };
}

/**
 * Which kinds a surface owns. `scope` is the surface's default and `kind`
 * narrows it further, so /news can never accidentally show a paper.
 */
export type NewsScope = "news" | "research" | "all";

export const NEWS_SCOPE_KINDS: Record<NewsScope, string[] | null> = {
  news: ["release", "announcement", "runtime", "community"],
  research: ["paper"],
  all: null
};

export const newsQuerySchema = z.object({
  window: z.enum(WINDOWS).catch("7d"),
  scope: z.enum(["news", "research", "all"]).catch("news"),
  category: z.string().min(1).optional(),
  kind: z.enum(["paper", "release", "announcement", "runtime", "community"]).optional(),
  limit: z.coerce.number().int().positive().max(100).catch(30),
  page: z.coerce.number().int().positive().catch(1)
});

const EMPTY_NEWS_QUERY = { window: "7d", scope: "news", limit: 30, page: 1 } as const;

export function parseNewsQuery(search: Record<string, string | string[] | undefined>) {
  const parsed = newsQuerySchema.safeParse(cleanSearch(search));
  if (!parsed.success) return { ...EMPTY_NEWS_QUERY, windowDays: windowDays(EMPTY_NEWS_QUERY.window) };

  return {
    windowDays: windowDays(parsed.data.window),
    scope: parsed.data.scope,
    category: parsed.data.category,
    kind: parsed.data.kind,
    limit: parsed.data.limit,
    page: parsed.data.page
  };
}

/**
 * The Data Desk (docs/en/STATS-PLAN.md S3).
 *
 * It speaks the feed's window vocabulary - `24h / 7d / 30d / 90d` - because a
 * control that offers a number no other page offers is a second dialect. The old
 * `/stats?days=180` links are mapped onto it instead of 404ing: 180 days of
 * tracking do not exist (the snapshot's `firstSeenAt` spans three), and `90d`
 * already covers every row ever seen.
 *
 * `/stats` defaults to 30 days, not the feed's 7: its time panel reads
 * `createdAt`, which spans 49 days, so a 7-day default would hide most of the
 * only series with daily resolution.
 */
export const STATS_DEFAULT_WINDOW = "30d" as const;

export const statsQuerySchema = z.object({
  window: z.enum(WINDOWS).catch(STATS_DEFAULT_WINDOW),
  /** Legacy alias for `window`; `?days=180` lands on `90d`. */
  days: z.coerce.number().positive().optional().catch(undefined),
  gate: z.enum(["passed", "all"]).catch("passed")
});

/** Nearest window at or below `days`, so a hand-edited `?days=5` is not a lie. */
export function windowFromDays(days: number): (typeof WINDOWS)[number] {
  if (days <= 1) return "24h";
  if (days <= 7) return "7d";
  if (days <= 30) return "30d";
  return "90d";
}

export function parseStatsQuery(search: Record<string, string | string[] | undefined>) {
  const cleaned = cleanSearch(search);
  const parsed = statsQuerySchema.safeParse(cleaned);
  const data = parsed.success ? parsed.data : { window: STATS_DEFAULT_WINDOW, gate: "passed" as const };
  /* `window` is `.catch`-guarded, so it is always present after parsing; only the
     raw search can tell whether the reader supplied one, and the legacy `days`
     alias must lose to it. */
  const window = cleaned.window ? data.window : data.days ? windowFromDays(data.days) : data.window;
  const normalized = normalizeFeedQuery(
    { window, gate: data.gate, sort: FEED_DEFAULTS.sort, limit: 0, page: 1 },
    { aggregate: true }
  );

  return {
    window,
    windowDays: windowDays(window),
    gate: normalized.gate,
    /** The reader asked for everything above the 30-day limit and was dialled back. */
    gateForced: normalized.gate !== data.gate
  };
}
