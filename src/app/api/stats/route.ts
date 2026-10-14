import { NextResponse, type NextRequest } from "next/server";
import { getStats } from "@/lib/db/store";

const CACHE = "public, s-maxage=900";

export async function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 30);
  const days = Number.isFinite(raw) && raw > 0 && raw <= 180 ? raw : 30;
  const stats = await getStats(days);
  return NextResponse.json({ days, stats }, { headers: { "Cache-Control": CACHE } });
}
