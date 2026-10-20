import type { ClassifiedModel } from "./model.ts";
import type { SnapshotNews } from "./store.ts";

/**
 * Why a name token and not a substring search.
 *
 * `matchModel()` in the ingest required the *whole* repository name inside a
 * headline, which is fine for `MiniMax-H3-Turbo` and hopeless for the names this
 * feed is full of: `nerkyor/Qwen3.8-27B-Coder390-EfficientThink-Opus5.5-GPT6Astra-
 * Grok4.7-DSV4Pro-K3-SFT-RLOO-GGUF-NInfer` is 108 characters and appears in no
 * headline, ever. So that model could not acquire a news link (measured on the
 * served snapshot 2026-10-18: 6 / 104 news rows carry `modelSlug`, 0 of them for
 * that model) and its page had no "mentioned in" list to show.
 *
 * Loosening the search to *any* shared word does not work either — measured on
 * the same snapshot, plain word matching attributed 20 news rows to
 * `long_rolling_switch_prompt_from_ode_init` (via "prompt"), 11 to
 * `cedar-horizon-91` (via "horizon") and 5 to `Adversarial-Gradient-Forcing`.
 *
 * So a token is only trusted when it is a version/build identifier: at least six
 * characters **and containing a digit** (`qwen3.5`, `coder390`, `600step`,
 * `flux.2`), and rare across the tracked names (`tokenDf`). Two thresholds, used
 * for two different jobs:
 *
 * - **Ingest (`modelSlug`)**: `tokenDf === 1`. A link stored in the snapshot must
 *   never be a guess between siblings, so only a token that names exactly one
 *   tracked model may create it.
 * - **Read (`getModelNews`)**: `tokenDf <= FAMILY_TOKEN_MAX_MODELS`. A "mentioned
 *   in" list is context, not an assertion, and a release note about the family
 *   (`qwen3.5`, shared by a handful of finetunes) is still worth printing.
 */

export const TOKEN_MIN_LENGTH = 6;

/**
 * A family token may name at most this many tracked models before it stops
 * being distinctive. Measured 2026-10-18 on the served snapshot: with `3`, 5 of
 * 915 models gain a mention and every hit is a real one (`qwen3.5`, `600step`,
 * `flux.2`); with `5`, `opus5.5` starts matching an unrelated agent paper.
 */
export const FAMILY_TOKEN_MAX_MODELS = 3;

export interface ModelNameIndex {
  /** How many tracked model names contain each trusted token. */
  tokenDf: Map<string, number>;
}

/**
 * `Qwen3.8-27B-Coder390-EfficientThink` splits on everything that is not a letter,
 * digit or dot, so `qwen3.8` and `flux.2` stay whole. Tokens shorter than
 * `TOKEN_MIN_LENGTH` or without a digit are dropped — those are the words that
 * produced the false positives above.
 */
export function nameTokens(name: string): string[] {
  const tokens = name
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .filter((token) => token.length >= TOKEN_MIN_LENGTH && /\d/.test(token));
  return [...new Set(tokens)];
}

export function buildModelNameIndex(models: ClassifiedModel[]): ModelNameIndex {
  const tokenDf = new Map<string, number>();
  for (const model of models) {
    for (const token of nameTokens(model.name)) {
      tokenDf.set(token, (tokenDf.get(token) ?? 0) + 1);
    }
  }
  return { tokenDf };
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-token match, not substring: `qwen3.5` must not match `qwen3.55`, and a
 * token inside a longer identifier (`flux.2-klein`) still counts because `.` and
 * `-` are boundaries for the surrounding text but not for the token itself.
 */
export function textHasToken(text: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9.])${escapeRegExp(token)}([^a-z0-9.]|$)`, "i").test(text);
}

/** Tokens that point at a small family of models — good enough for a mention list. */
export function familyTokens(model: ClassifiedModel, index: ModelNameIndex): string[] {
  return nameTokens(model.name).filter((token) => (index.tokenDf.get(token) ?? 0) <= FAMILY_TOKEN_MAX_MODELS);
}

/** Tokens that point at exactly one tracked model — the only ones worth storing as a link. */
export function uniqueTokens(model: ClassifiedModel, index: ModelNameIndex): string[] {
  return nameTokens(model.name).filter((token) => index.tokenDf.get(token) === 1);
}

function newsText(item: SnapshotNews): string {
  return `${item.title ?? ""} ${item.summary ?? ""}`;
}

/**
 * True when the item is either linked to this model by the ingest or names one of
 * its distinctive family tokens. An item linked to *another* model is never
 * claimed here: a direct link is stronger evidence than a shared token.
 */
export function newsMentionsModel(item: SnapshotNews, model: ClassifiedModel, index: ModelNameIndex): boolean {
  if (item.modelSlug) return item.modelSlug === model.slug;
  const text = newsText(item);
  return familyTokens(model, index).some((token) => textHasToken(text, token));
}

export function newsForModel(
  model: ClassifiedModel,
  news: SnapshotNews[],
  index: ModelNameIndex,
  limit = 6
): SnapshotNews[] {
  const rows = news.filter((item) => newsMentionsModel(item, model, index));
  return [...rows]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}

/**
 * Ingest-side matcher: the full name first (unchanged behaviour and the highest
 * confidence), then the longest token that names exactly one tracked model.
 * Returns `undefined` when nothing is unambiguous, because a wrong `modelSlug` is
 * worse than a missing one — the news page prints the link as a fact.
 */
export function matchModelInText(
  text: string,
  models: ClassifiedModel[],
  index: ModelNameIndex = buildModelNameIndex(models)
): ClassifiedModel | undefined {
  const haystack = text.toLowerCase();
  const exact = models.find((model) => {
    const name = model.name.toLowerCase();
    return name.length > 3 && haystack.includes(name);
  });
  if (exact) return exact;

  const candidates: Array<{ model: ClassifiedModel; token: string }> = [];
  for (const model of models) {
    for (const token of uniqueTokens(model, index)) {
      if (textHasToken(haystack, token)) candidates.push({ model, token });
    }
  }
  if (candidates.length === 0) return undefined;
  // Longest token wins ("qwen3.5-coder" beats "qwen3.5"), and a tie between two
  // different models is a coin flip, so it is dropped.
  const best = candidates.reduce((left, right) => (right.token.length > left.token.length ? right : left));
  const tied = candidates.filter((candidate) => candidate.token.length === best.token.length && candidate.model !== best.model);
  return tied.length > 0 ? undefined : best.model;
}
