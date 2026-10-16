import { NextResponse, type NextRequest } from "next/server";
import { getStats, getDailySeries } from "@/lib/store";

const CACHE = "public, s-maxage=900";

export async function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 30);
  const days = Number.isFinite(raw) && raw > 0 && raw <= 180 ? raw : 30;
  /* The feed's default gate, so /api/stats and /api/feed describe one dataset. */
  const gate = request.nextUrl.searchParams.get("gate") === "all" ? "all" : "passed";
  const [stats, series] = await Promise.all([getStats(days, { gate }), getDailySeries(days, { gate })]);
  return NextResponse.json({ days, gate, stats, series }, { headers: { "Cache-Control": CACHE } });
}
