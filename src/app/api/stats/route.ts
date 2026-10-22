import { NextResponse, type NextRequest } from "next/server";
import { getStatsBoard } from "@/lib/store";
import { parseStatsQuery } from "@/lib/query";

const CACHE = "public, s-maxage=900";

/**
 * The Data Desk's own numbers (docs/en/STATS-PLAN.md §8).
 *
 * One board per request, the same one the page renders, so a figure the page
 * prints can always be reproduced here. `window` speaks the feed's vocabulary;
 * the old `?days=` links are parsed as an alias. The previous `stats`/`series`
 * keys are gone - they described a first-seen series that spans three days and a
 * page that no longer exists, and nothing outside the docs consumed them.
 */
export async function GET(request: NextRequest) {
  const query = parseStatsQuery(Object.fromEntries(request.nextUrl.searchParams));
  const board = await getStatsBoard(query.windowDays, { gate: query.gate });
  return NextResponse.json({ window: query.window, ...board, gateForced: query.gateForced }, { headers: { "Cache-Control": CACHE } });
}
