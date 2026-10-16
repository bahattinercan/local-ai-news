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
 * search box arrives as `""` — and `?runner=` typed by hand does the same.
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
 * Decision 9: "Show everything" is only allowed inside a 30-day window with a
 * category selected, otherwise the result set explodes.
 */
export function normalizeFeedQuery(input: FeedQueryInput) {
  const days = windowDays(input.window);
  const gate = input.gate === "all" && (days > 30 || !input.category) ? "passed" : input.gate;

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

/** What a query nobody asked for means; also the last-resort fallback below. */
const EMPTY_FEED_QUERY: FeedQueryInput = { ...FEED_DEFAULTS, limit: 24, page: 1 };

export function parseFeedQuery(search: Record<string, string | string[] | undefined>) {
  // `page` used to be missing here, so ?page=2 silently rendered page 1 and the
  // numbered pagination links were dead ends.
  const parsed = feedQuerySchema.safeParse(cleanSearch(search));
  return normalizeFeedQuery(parsed.success ? parsed.data : EMPTY_FEED_QUERY);
}

/** The filter state as a query *input* — what the tab bar counts and links from. */
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
