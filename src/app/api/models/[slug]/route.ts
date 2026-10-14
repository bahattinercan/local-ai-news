import { NextResponse } from "next/server";
import { getModel } from "@/lib/db/store";

const CACHE = "public, s-maxage=900";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const model = await getModel(slug);

  if (!model) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ model }, { headers: { "Cache-Control": CACHE } });
}
