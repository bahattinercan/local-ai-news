import { NextResponse, type NextRequest } from "next/server";
import { getFeed, countFeed } from "@/lib/store";
import { clampPage, pageCount, parseFeedQuery } from "@/lib/query";

const CACHE = "public, s-maxage=900";

export async function GET(request: NextRequest) {
  const parsed = parseFeedQuery(Object.fromEntries(request.nextUrl.searchParams));
  /* The API is paginated too: answer with the page it actually served and how
     many pages exist, so `?page=999` cannot look like an empty dataset. */
  const total = await countFeed(parsed);
  const pages = pageCount(total, parsed.limit);
  const page = clampPage(parsed.page, total, parsed.limit);
  const models = await getFeed({ ...parsed, page });

  return NextResponse.json(
    { query: { ...parsed, page }, total, pages, count: models.length, models },
    { headers: { "Cache-Control": CACHE } }
  );
}
