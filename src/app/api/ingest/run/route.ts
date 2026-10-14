import { NextResponse, type NextRequest } from "next/server";
import { runIngest } from "@/lib/ingest";

/**
 * Called by cron-job.org through GitHub Actions (decision 6). On Vercel the
 * filesystem is read-only, so this route needs DATABASE_URL; the snapshot
 * writer is for local development only.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingest-secret") ?? request.nextUrl.searchParams.get("secret");

  if (!process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "INGEST_SECRET is not set" }, { status: 500 });
  }
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runIngest({
    dryRun: false,
    maxPerCategory: 200,
    pagesPerCategory: 2,
    windowDays: 7,
    token: process.env.HF_TOKEN,
    maxRequests: 92
  });

  return NextResponse.json(result);
}
