import { z } from "zod";

export const WINDOWS = ["24h", "7d", "30d", "90d"] as const;
export const SORTS = ["new", "trending", "downloads", "likes"] as const;

export const feedQuerySchema = z.object({
  category: z.string().min(1).optional(),
  window: z.enum(WINDOWS).default("7d"),
  sort: z.enum(SORTS).default("new"),
  gate: z.enum(["passed", "all"]).default("passed"),
  runner: z.string().min(1).optional(),
  maxParams: z.coerce.number().positive().optional(),
  license: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(60),
  page: z.coerce.number().int().positive().default(1)
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

export function parseFeedQuery(search: Record<string, string | string[] | undefined>) {
  return normalizeFeedQuery(feedQuerySchema.parse({
    category: search.category,
    window: search.window,
    sort: search.sort,
    gate: search.gate,
    runner: search.runner,
    maxParams: search.maxParams,
    license: search.license,
    q: search.q,
    limit: search.limit
  }));
}

export const newsQuerySchema = z.object({
  window: z.enum(WINDOWS).default("7d"),
  category: z.string().min(1).optional(),
  kind: z.enum(["paper", "release", "announcement"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export function parseNewsQuery(search: Record<string, string | string[] | undefined>) {
  const parsed = newsQuerySchema.parse({
    window: search.window,
    category: search.category,
    kind: search.kind,
    limit: search.limit
  });
  return { windowDays: windowDays(parsed.window), category: parsed.category, kind: parsed.kind, limit: parsed.limit };
}
