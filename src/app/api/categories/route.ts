import { NextResponse } from "next/server";
import { getCategories } from "@/lib/store";

const CACHE = "public, s-maxage=900";

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json({ categories }, { headers: { "Cache-Control": CACHE } });
}
