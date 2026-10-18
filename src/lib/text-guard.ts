/**
 * Guards for text that came from a JSON snapshot nobody validates.
 *
 * Measured 2026-10-18 on the served Blob snapshot: **40 of 185 news items** carry
 * the literal string `"[object Object]"` as `organization` — a stringified object
 * that reached a text field somewhere upstream (all 40 are `paper` entries, and
 * they are baked into both the published blob and the repo copy).
 *
 * The value never heals by itself: `mergeSnapshotBases()` fills only the fields
 * the older record *lacks*, so a poisoned string always wins over a later correct
 * value. Both sides of that merge therefore have to agree on what "carries no
 * information" means, which is why this lives in its own module (the store's read
 * path must not depend on the ingest module, which pulls in the HTTP client).
 */
const POISONED_TEXT = /^\[object [a-z0-9]+\]$/i;

/** `"[object Object]"`, `"[object Promise]"`, … — a stringified object, never a label. */
export function isPoisonedText(value: unknown): boolean {
  return typeof value === "string" && POISONED_TEXT.test(value.trim());
}

/**
 * A value safe to print, or `null`. Trims, and drops both the empty string and a
 * poisoned one, so a caller can render the field's absence as absence.
 */
export function cleanLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || isPoisonedText(trimmed)) return null;
  return trimmed;
}
