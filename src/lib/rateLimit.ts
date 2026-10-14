/** In-memory per-IP limiter. Single instance only — on Vercel this is per-function instance. */
const hits = new Map<string, { count: number; windowStart: number }>();

export const RATE_LIMIT_MAX = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const entry = hits.get(ip);
  if (!entry) {
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export function resetRateLimit(): void {
  hits.clear();
}
