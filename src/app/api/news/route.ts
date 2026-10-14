import { NextResponse, type NextRequest } from "next/server";
import { getNews } from "@/lib/store";
import { parseNewsQuery } from "@/lib/query";

const CACHE = "public, s-maxage=300";

export async function GET(request: NextRequest) {
  const query = parseNewsQuery(Object.fromEntries(request.nextUrl.searchParams));
  const items = await getNews(query);
  return NextResponse.json({ query, count: items.length, items }, { headers: { "Cache-Control": CACHE } });
}
