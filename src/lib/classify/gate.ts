import { CURATED_ORGS } from "./rules.ts";
import type { RawModel } from "../model.ts";

export type GateReason = "likes" | "downloads" | "org" | "samples" | "failed";

export interface GateResult {
  passed: boolean;
  reason: GateReason;
  /** Gate-failed rows are only stored when this is true (growth cap, decision 11). */
  storeRaw: boolean;
}

export const GATE_THRESHOLDS = {
  likes: 5,
  downloads: 50,
  rawLikes: 1,
  rawDownloads: 10
};

export function hasSamples(model: RawModel): boolean {
  const widget = model.cardData?.widget;
  if (Array.isArray(widget) && widget.length > 0) return true;
  const siblings = model.siblings ?? [];
  return siblings.some((f) => /^samples\//i.test(f) || /\.(png|jpg|jpeg|webp)$/i.test(f));
}

export function evaluateGate(model: RawModel, curatedOrgs: string[] = CURATED_ORGS): GateResult {
  // Scope rule: gated models are not downloadable, so they never enter the feed.
  if (model.gated) return { passed: false, reason: "failed", storeRaw: false };

  const author = model.author ?? "";
  const isCurated = curatedOrgs.some((org) => org.toLowerCase() === author.toLowerCase());

  if (model.likes >= GATE_THRESHOLDS.likes) return { passed: true, reason: "likes", storeRaw: true };
  if (model.downloads >= GATE_THRESHOLDS.downloads) return { passed: true, reason: "downloads", storeRaw: true };
  if (isCurated) return { passed: true, reason: "org", storeRaw: true };
  if (hasSamples(model)) return { passed: true, reason: "samples", storeRaw: true };

  const storeRaw =
    model.likes >= GATE_THRESHOLDS.rawLikes ||
    model.downloads >= GATE_THRESHOLDS.rawDownloads ||
    isCurated;

  return { passed: false, reason: "failed", storeRaw };
}
