import { NextResponse, type NextRequest } from "next/server";
import { getFeed } from "@/lib/db/store";
import { parseFeedQuery } from "@/lib/query";

const CACHE = "public, s-maxage=900";

export async function GET(request: NextRequest) {
  const query = parseFeedQuery(Object.fromEntries(request.nextUrl.searchParams));
  const models = await getFeed(query);

  return NextResponse.json(
    { query, count: models.length, models },
    { headers: { "Cache-Control": CACHE } }
  );
}
