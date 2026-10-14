import { NextResponse, type NextRequest } from "next/server";
import { runIngest } from "@/lib/ingest";

/**
 * Local/dev only. Production ingest runs in GitHub Actions (decision 6) and
 * publishes the snapshot to Vercel Blob; Vercel's filesystem is read-only, so
 * this route cannot persist anything there.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingest-secret") ?? request.nextUrl.searchParams.get("secret");

  if (!process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "INGEST_SECRET is not set" }, { status: 500 });
  }
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIngest({
      dryRun: false,
      maxPerCategory: 200,
      pagesPerCategory: 2,
      windowDays: 7,
      token: process.env.HF_TOKEN,
      maxRequests: 92
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "cannot write the snapshot here — run the ingest in GitHub Actions",
        detail: (error as Error).message
      },
      { status: 501 }
    );
  }
}
